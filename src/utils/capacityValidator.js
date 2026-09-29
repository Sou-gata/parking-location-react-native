/**
 * Parking Space Capacity Validator (Frontend)
 * 
 * Computes whether the configured vehicle capacities physically fit within
 * the given parking space dimensions (floor area length x width).
 * Multi-layer parking is not allowed.
 */

import apiService from "./apiService";

// ============================================================================
// CONFIGURATION TOGGLE: Set to true to make capacity validation strictly blocking
// on the frontend UI (e.g. disable submit button, disallow saving).
// When false (default), non-blocking warnings and visual feedback are displayed.
// ============================================================================
export const BLOCK_ON_CAPACITY_EXCEEDED = false;

// Default parking utilization factor: 65% of floor area for parking slots,
// 35% reserved for drive aisles, turning radiuses, entry/exit paths, and pillars.
export const DEFAULT_UTILIZATION_FACTOR = 0.65;

export const VEHICLE_FOOTPRINTS = {
    two_wheeler: {
        name: "Two-Wheeler",
        length: 2.0,
        width: 0.8,
        areaM2: 1.6,
        aliases: ["two_wheeler_capacity", "twoWheelerCapacity", "twoWheeler", "two_wheeler"]
    },
    three_wheeler: {
        name: "Three-Wheeler",
        length: 3.2,
        width: 1.5,
        areaM2: 4.8,
        aliases: ["three_wheeler_capacity", "threeWheelerCapacity", "threeWheeler", "three_wheeler"]
    },
    car: {
        name: "Car / Sedan",
        length: 4.5,
        width: 1.8,
        areaM2: 8.1,
        aliases: ["car_capacity", "carCapacity", "car", "four_wheeler_capacity"]
    },
    suv: {
        name: "SUV",
        length: 5.0,
        width: 2.0,
        areaM2: 10.0,
        aliases: ["suv_capacity", "suvCapacity", "suv"]
    },
    van: {
        name: "Van / Minibus",
        length: 5.5,
        width: 2.1,
        areaM2: 11.55,
        aliases: ["van_capacity", "vanCapacity", "van"]
    },
    pickup: {
        name: "Pickup Truck",
        length: 5.5,
        width: 2.0,
        areaM2: 11.0,
        aliases: ["pickup_capacity", "pickupCapacity", "pickup"]
    },
    ev: {
        name: "EV Charging Spot",
        length: 4.5,
        width: 1.8,
        areaM2: 8.1,
        aliases: ["ev_capacity", "evCapacity", "ev"]
    }
};

/**
 * Convert linear dimension to meters.
 */
export function convertToMeters(value, unit = "meters") {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return 0;

    const normalizedUnit = (unit || "meters").toLowerCase().trim();
    switch (normalizedUnit) {
        case "feet":
        case "ft":
            return num * 0.3048;
        case "yards":
        case "yd":
            return num * 0.9144;
        case "meters":
        case "m":
        default:
            return num;
    }
}

/**
 * Extract capacity count supporting multiple naming conventions.
 */
function extractCapacityCount(capacities, footprintConfig) {
    if (!capacities || typeof capacities !== "object") return 0;

    for (const key of footprintConfig.aliases) {
        if (capacities[key] !== undefined && capacities[key] !== null) {
            const parsed = parseInt(capacities[key], 10);
            return isNaN(parsed) || parsed < 0 ? 0 : parsed;
        }
    }
    return 0;
}

/**
 * Validate parking capacity synchronously on the client.
 */
export function validateCapacityFitsSpace({
    length,
    width,
    unit = "meters",
    capacities = {},
    utilizationFactor = DEFAULT_UTILIZATION_FACTOR
}) {
    const lengthM = convertToMeters(length, unit);
    const widthM = convertToMeters(width, unit);

    if (lengthM <= 0 || widthM <= 0) {
        return {
            checked: false,
            valid: true,
            reason: "Dimensions not provided; validation skipped.",
            breakdown: [],
            totalAreaM2: 0,
            usableAreaM2: 0,
            requiredAreaM2: 0,
            excessAreaM2: 0,
            occupancyPercentage: 0,
            utilizationFactor,
            isBlocking: BLOCK_ON_CAPACITY_EXCEEDED
        };
    }

    const totalAreaM2 = parseFloat((lengthM * widthM).toFixed(2));
    const factor = Math.min(Math.max(parseFloat(utilizationFactor) || DEFAULT_UTILIZATION_FACTOR, 0.1), 1.0);
    const usableAreaM2 = parseFloat((totalAreaM2 * factor).toFixed(2));

    let requiredAreaM2 = 0;
    let totalVehicleCount = 0;
    const breakdown = [];

    for (const [typeKey, config] of Object.entries(VEHICLE_FOOTPRINTS)) {
        const count = extractCapacityCount(capacities, config);
        if (count > 0) {
            const subtotalArea = parseFloat((count * config.areaM2).toFixed(2));
            requiredAreaM2 += subtotalArea;
            totalVehicleCount += count;
            breakdown.push({
                type: typeKey,
                name: config.name,
                count,
                unitAreaM2: config.areaM2,
                totalAreaM2: subtotalArea
            });
        }
    }

    requiredAreaM2 = parseFloat(requiredAreaM2.toFixed(2));
    const excessAreaM2 = parseFloat(Math.max(0, requiredAreaM2 - usableAreaM2).toFixed(2));
    const valid = requiredAreaM2 <= usableAreaM2;
    const occupancyPercentage = usableAreaM2 > 0 ? parseFloat(((requiredAreaM2 / usableAreaM2) * 100).toFixed(1)) : 0;

    let message = "Capacity fits within parking dimensions.";
    if (!valid) {
        message = `Declared vehicles require ${requiredAreaM2} m² of slot space, but usable area is only ${usableAreaM2} m² (${Math.round(factor * 100)}% of total ${totalAreaM2} m²). Exceeded by ${excessAreaM2} m² (${occupancyPercentage}%).`;
    }

    return {
        checked: true,
        valid,
        totalVehicleCount,
        dimensions: {
            length: parseFloat(length),
            width: parseFloat(width),
            unit,
            lengthMeters: parseFloat(lengthM.toFixed(2)),
            widthMeters: parseFloat(widthM.toFixed(2))
        },
        totalAreaM2,
        usableAreaM2,
        requiredAreaM2,
        excessAreaM2,
        occupancyPercentage,
        utilizationFactor: factor,
        breakdown,
        message,
        isBlocking: BLOCK_ON_CAPACITY_EXCEEDED
    };
}

/**
 * Validate parking capacity using the backend server endpoint.
 */
export async function validateCapacityWithServer({
    length,
    width,
    unit = "meters",
    capacities = {},
    utilizationFactor = DEFAULT_UTILIZATION_FACTOR
}) {
    try {
        const response = await apiService.post("agencies/validate-capacity", {
            length,
            width,
            unit,
            capacities,
            utilizationFactor
        });
        return response?.data || null;
    } catch (error) {
        console.warn("Backend capacity check failed, falling back to local:", error);
        return validateCapacityFitsSpace({ length, width, unit, capacities, utilizationFactor });
    }
}
