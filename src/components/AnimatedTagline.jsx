import React, { useEffect, useRef, useState } from "react";
import { View, Animated, StyleSheet, Easing, Text } from "react-native";

const BRAND = "PARKOZY";

export default function AnimatedTagline() {
    // ── Animation refs ──────────────────────────────────────────────────────
    const containerAnim = useRef(new Animated.Value(0)).current;
    const carSlide = useRef(new Animated.Value(-80)).current;
    const carBounce = useRef(new Animated.Value(0)).current;
    const prefix1Anim = useRef(new Animated.Value(0)).current;
    const prefix2Anim = useRef(new Animated.Value(0)).current;
    const brandEntrance = useRef(new Animated.Value(0)).current;
    const brandRotate = useRef(new Animated.Value(-8)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const shimmerX = useRef(new Animated.Value(-120)).current;
    const underlineW = useRef(new Animated.Value(0)).current;
    const subtitleAnim = useRef(new Animated.Value(0)).current;
    const subShimmerX = useRef(new Animated.Value(-150)).current;
    const subUnderlineW = useRef(new Animated.Value(0)).current;
    const subGlowAnim = useRef(new Animated.Value(0)).current;

    // Sparkle anims: 3 independent floating sparkles
    const sp1 = useRef(new Animated.Value(0)).current;
    const sp2 = useRef(new Animated.Value(0)).current;
    const sp3 = useRef(new Animated.Value(0)).current;
    const sp1Y = useRef(new Animated.Value(0)).current;
    const sp2Y = useRef(new Animated.Value(0)).current;
    const sp3Y = useRef(new Animated.Value(0)).current;

    const [displayedBrand, setDisplayedBrand] = useState("");
    const [brandDone, setBrandDone] = useState(false);
    const [cursorVisible, setCursorVisible] = useState(true);

    // ── Sparkle float loop ──────────────────────────────────────────────────
    const startSparkle = (opAnim, yAnim, delay) => {
        const loop = () => {
            opAnim.setValue(0);
            yAnim.setValue(0);
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(opAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(yAnim, {
                        toValue: -6,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(opAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(yAnim, {
                        toValue: -14,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(900),
            ]).start(() => loop());
        };
        loop();
    };

    useEffect(() => {
        // 1. Fade container in
        Animated.timing(containerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // 2. Car springs in, then gently hovers
        Animated.sequence([
            Animated.spring(carSlide, {
                toValue: 0,
                tension: 70,
                friction: 7,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(carBounce, {
                        toValue: -3,
                        duration: 500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(carBounce, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            ),
        ]).start();

        // 3. "Parking ka Tension" bounces up
        Animated.timing(prefix1Anim, {
            toValue: 1,
            duration: 600,
            delay: 500,
            easing: Easing.out(Easing.back(2.5)),
            useNativeDriver: true,
        }).start();

        // 4. "choro.." + "karo." bounce up
        Animated.timing(prefix2Anim, {
            toValue: 1,
            duration: 600,
            delay: 750,
            easing: Easing.out(Easing.back(2.5)),
            useNativeDriver: true,
        }).start();

        // 5. Typewriter on Parkozy
        let charIndex = 0;
        const typeStart = setTimeout(() => {
            const typeInterval = setInterval(() => {
                charIndex++;
                setDisplayedBrand(BRAND.slice(0, charIndex));
                if (charIndex === BRAND.length) {
                    clearInterval(typeInterval);
                    setBrandDone(true);

                    // 6. Badge pops in with spring + rotation settle
                    Animated.parallel([
                        Animated.spring(brandEntrance, {
                            toValue: 1,
                            tension: 120,
                            friction: 6,
                            useNativeDriver: true,
                        }),
                        Animated.spring(brandRotate, {
                            toValue: 0,
                            tension: 80,
                            friction: 7,
                            useNativeDriver: true,
                        }),
                    ]).start();

                    // 7. Underline draws itself
                    Animated.timing(underlineW, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: false,
                    }).start();

                    // 8. Glow breathe
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(glowAnim, {
                                toValue: 1,
                                duration: 1100,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                            Animated.timing(glowAnim, {
                                toValue: 0.3,
                                duration: 1100,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                        ])
                    ).start();

                    // 9. Shimmer sweep loop
                    shimmerX.setValue(-120);
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(shimmerX, {
                                toValue: 180,
                                duration: 1800,
                                easing: Easing.linear,
                                useNativeDriver: true,
                            }),
                            Animated.delay(1200),
                        ])
                    ).start();
                }
            }, 80);
        }, 1000);

        // 10. Subtitle springs up + shimmer sweep + glowing underline + glow loop
        Animated.spring(subtitleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            delay: 1500,
            useNativeDriver: true,
        }).start(() => {
            // Underline draws itself
            Animated.timing(subUnderlineW, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();

            // Glow breathe loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(subGlowAnim, {
                        toValue: 1,
                        duration: 1100,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(subGlowAnim, {
                        toValue: 0.3,
                        duration: 1100,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Shimmer sweep loop
            subShimmerX.setValue(-150);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(subShimmerX, {
                        toValue: 280,
                        duration: 1800,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1200),
                ])
            ).start();
        });

        // 11. Blinking cursor while typing
        const cursorInterval = setInterval(() => {
            setCursorVisible((v) => !v);
        }, 500);

        // 12. Floating sparkles
        startSparkle(sp1, sp1Y, 600);
        startSparkle(sp2, sp2Y, 1200);
        startSparkle(sp3, sp3Y, 1800);

        return () => {
            clearTimeout(typeStart);
            clearInterval(cursorInterval);
        };
    }, []);

    // ── Derived interpolations ──────────────────────────────────────────────
    const p1Style = {
        opacity: prefix1Anim,
        transform: [
            {
                translateY: prefix1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
        ],
    };
    const p2Style = {
        opacity: prefix2Anim,
        transform: [
            {
                translateY: prefix2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
        ],
    };

    const badgeScale = brandEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 1],
    });

    const badgeRotation = brandRotate.interpolate({
        inputRange: [-8, 0],
        outputRange: ["-8deg", "-4deg"],
    });
    const badgeOpacity = brandDone
        ? glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.75, 1] })
        : brandEntrance;

    const underlineWidthInterp = underlineW.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const subtitleY = subtitleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [22, 0],
    });

    const subUnderlineWidthInterp = subUnderlineW.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const subPillOpacity = subGlowAnim.interpolate({
        inputRange: [0.3, 1],
        outputRange: [0.75, 1],
    });

    return (
        <Animated.View style={[styles.container, { opacity: containerAnim }]}>
            {/* ─── Floating sparkles ─── */}
            <Animated.Text
                style={[
                    styles.sparkle,
                    styles.sp1,
                    { opacity: sp1, transform: [{ translateY: sp1Y }] },
                ]}
            >
                ✦
            </Animated.Text>
            <Animated.Text
                style={[
                    styles.sparkle,
                    styles.sp2,
                    { opacity: sp2, transform: [{ translateY: sp2Y }] },
                ]}
            >
                ★
            </Animated.Text>
            <Animated.Text
                style={[
                    styles.sparkle,
                    styles.sp3,
                    { opacity: sp3, transform: [{ translateY: sp3Y }] },
                ]}
            >
                ✦
            </Animated.Text>

            {/* ─── Main block ─── */}
            <View style={styles.mainBlock}>
                {/* Animated car */}
                <Animated.Text
                    style={[
                        styles.car,
                        {
                            transform: [
                                { translateX: carSlide },
                                { translateY: carBounce },
                            ],
                        },
                    ]}
                >
                    🚘
                </Animated.Text>

                {/* Text column */}
                <View style={styles.textCol}>
                    {/* Row 1: "Parking ka Tension choro.." */}
                    <View style={styles.wordRow}>
                        <Animated.View style={p1Style}>
                            <Text style={styles.prefixText}>
                                Parking ka Tension{" "}
                            </Text>
                        </Animated.View>
                        <Animated.View style={p2Style}>
                            <Text style={styles.prefixText}>choro..</Text>
                        </Animated.View>
                    </View>

                    {/* Row 2: PARKOZY badge + "karo." */}
                    <View style={[styles.wordRow, styles.row2Center]}>
                        {/* Parkozy badge */}
                        <View style={styles.brandOuter}>
                            <Animated.View
                                style={[
                                    styles.brandBadge,
                                    {
                                        opacity: badgeOpacity,
                                        transform: [
                                            { scale: badgeScale },
                                            { rotate: badgeRotation },
                                        ],
                                    },
                                ]}
                            >
                                <Text style={styles.brandText}>
                                    {displayedBrand}
                                </Text>
                                {!brandDone && (
                                    <Text
                                        style={[
                                            styles.brandText,
                                            {
                                                opacity: cursorVisible ? 1 : 0,
                                            },
                                        ]}
                                    >
                                        |
                                    </Text>
                                )}
                                {/* Shimmer sweep */}
                                <Animated.View
                                    style={[
                                        styles.shimmer,
                                        {
                                            transform: [
                                                { translateX: shimmerX },
                                                { rotate: "-25deg" },
                                            ],
                                        },
                                    ]}
                                />
                            </Animated.View>
                            {/* Glowing underline */}
                            <Animated.View
                                style={[
                                    styles.underline,
                                    {
                                        width: underlineWidthInterp,
                                    },
                                ]}
                            />
                        </View>

                        <Animated.View style={p2Style}>
                            <Text style={styles.prefixText}> karo.</Text>
                        </Animated.View>
                    </View>
                </View>
            </View>

            {/* ─── Subtitle pill ─── */}
            <Animated.View
                style={[
                    styles.subtitleWrap,
                    {
                        opacity: subtitleAnim,
                        transform: [{ translateY: subtitleY }],
                    },
                ]}
            >
                <View style={styles.subOuter}>
                    <Animated.View
                        style={[
                            styles.subtitlePill,
                            {
                                opacity: subPillOpacity,
                            },
                        ]}
                    >
                        {/* Static green dot */}
                        <View style={styles.dot} />
                        <Text style={styles.subtitleText}>
                            Comfortable Parking, Simplified ✨
                        </Text>
                    </Animated.View>
                    {/* Glowing mint underline */}
                    <Animated.View
                        style={[
                            styles.subUnderline,
                            {
                                width: subUnderlineWidthInterp,
                            },
                        ]}
                    />
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const GOLD = "#FFE566";
const GOLD_DIM = "rgba(255, 225, 50, 0.18)";
const GOLD_BORDER = "rgba(255, 218, 30, 0.70)";
const WHITE_85 = "rgba(255,255,255,0.88)";

const styles = StyleSheet.create({
    container: {
        width: "100%",
        alignItems: "center",
        marginTop: 0,
        paddingHorizontal: 6,
    },

    // ── Sparkles ──
    sparkle: {
        position: "absolute",
        fontSize: 10,
        color: GOLD,
        textShadowColor: "rgba(255,220,50,0.9)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        zIndex: 10,
        fontFamily: "Poppins-Black",
    },
    sp1: { top: -4, left: "12%" },
    sp2: { top: 2, right: "10%", fontSize: 9 },
    sp3: { top: 24, right: "22%", fontSize: 8 },

    // ── Main block ──
    mainBlock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
    },
    car: {
        fontSize: 32,
    },
    textCol: {
        flexShrink: 1,
        gap: 2,
    },
    wordRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    row2Center: {
        justifyContent: "center",
    },
    prefixText: {
        color: WHITE_85,
        fontSize: 14.5,
        fontWeight: "600",
        fontFamily: "Poppins-SemiBold",
        letterSpacing: 0.1,
        lineHeight: 24,
    },

    // ── Brand badge ──
    brandOuter: {
        alignItems: "center",
    },
    brandBadge: {
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: GOLD_DIM,
        borderWidth: 1.5,
        borderColor: GOLD_BORDER,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        elevation: 6,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
    },
    brandText: {
        color: GOLD,
        fontSize: 17,
        fontFamily: "Poppins-Black",
        letterSpacing: 2.5,
        textShadowColor: "rgba(255,230,60,1)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 14,
    },
    shimmer: {
        position: "absolute",
        top: -12,
        bottom: -12,
        width: 25,
        backgroundColor: "rgba(255,255,255,0.40)",
    },
    underline: {
        height: 2,
        borderRadius: 1,
        marginTop: 3,
        backgroundColor: GOLD,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },

    // ── Subtitle ──
    subtitleWrap: {
        marginTop: 16,
        alignItems: "center",
    },
    subOuter: {
        alignItems: "center",
    },
    subtitlePill: {
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.09)",
        borderWidth: 1,
        borderColor: "rgba(110, 231, 183, 0.45)",
        borderRadius: 30,
        paddingHorizontal: 18,
        paddingVertical: 8,
        gap: 10,
        elevation: 4,
        shadowColor: "#6EE7B7",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    subUnderline: {
        height: 2,
        borderRadius: 1,
        marginTop: 4,
        backgroundColor: "#6EE7B7",
        shadowColor: "#6EE7B7",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#6EE7B7",
        shadowColor: "#6EE7B7",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    subtitleText: {
        color: "rgba(255,255,255,0.88)",
        fontSize: 13,
        fontFamily: "Poppins-SemiBold",
        letterSpacing: 0.4,
    },
});
