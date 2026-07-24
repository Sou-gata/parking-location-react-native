export const STANDARD_VEHICLES = {
    twoWheeler: { label: "Two-Wheeler", icon: "motorbike" },
    threeWheeler: { label: "Three-Wheeler", icon: "rickshaw" },
    car: { label: "Car", icon: "car" },
    suv: { label: "SUV / MUV", icon: "car-estate" },
    van: { label: "Van", icon: "van-passenger" },
    pickup: { label: "Pickup Truck", icon: "car-pickup" },
    ev: { label: "EV", icon: "ev-station" },
};

export const getVehicleLabel = (type) => {
    if (STANDARD_VEHICLES[type]) {
        return STANDARD_VEHICLES[type].label;
    }
    return type
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
};

export const getVehicleIcon = (type) => {
    if (STANDARD_VEHICLES[type]) {
        return STANDARD_VEHICLES[type].icon;
    }
    return "car-side";
};

export const formatElapsed = (startTime) => {
    if (!startTime) return "-";
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    if (diffMs < 0) return "Just checked in";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
};

export const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return (
        date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        }) +
        " (" +
        date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
        }) +
        ")"
    );
};
