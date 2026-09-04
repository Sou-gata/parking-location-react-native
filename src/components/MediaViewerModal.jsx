import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Modal, Dimensions, Text } from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

const windowWidth = Dimensions.get("window").width;

export default function MediaViewerModal({ visible, onDismiss, media }) {
    const isVideo = media?.type === "video";

    // Video Player Control States
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(media?.duration || 30);
    const timerRef = useRef(null);

    // Reset states when media changes
    useEffect(() => {
        if (visible && media) {
            setCurrentTime(0);
            setIsPlaying(true);
            setDuration(media.duration || 30);
        }
    }, [visible, media]);

    // Video Playback Timer Effect
    useEffect(() => {
        if (visible && isVideo && isPlaying) {
            timerRef.current = setInterval(() => {
                setCurrentTime((prev) => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return duration;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [visible, isVideo, isPlaying, duration]);

    if (!visible || !media) return null;

    const imageUri = typeof media === "string" ? media : (media?.uri || media?.url || "");
    const imageUrls = imageUri ? [{ url: imageUri }] : [];

    // Video Controls Handlers
    const togglePlayPause = () => {
        if (currentTime >= duration) {
            setCurrentTime(0);
            setIsPlaying(true);
        } else {
            setIsPlaying((prev) => !prev);
        }
    };

    const handleRewind5s = () => {
        setCurrentTime((prev) => Math.max(0, prev - 5));
    };

    const handleSkip5s = () => {
        setCurrentTime((prev) => Math.min(duration, prev + 5));
    };

    const handleReplay = () => {
        setCurrentTime(0);
        setIsPlaying(true);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View className="flex-1 bg-black/95 justify-between items-center relative">
                {/* Header Bar */}
                <View className="w-full flex-row justify-between items-center px-4 pt-10 pb-4 z-20 bg-slate-900/80">
                    <View className="flex-row items-center gap-2">
                        <MaterialDesignIcons
                            name={isVideo ? "video" : "image"}
                            size={24}
                            color="#ff9933"
                        />
                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                            {media.title || (isVideo ? "Video Player" : "Image Viewer")}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onDismiss}
                        className="bg-slate-800 p-2 rounded-full border border-slate-700"
                    >
                        <MaterialDesignIcons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Content Area */}
                <View className="flex-1 w-full justify-center items-center overflow-hidden">
                    {!isVideo ? (
                        <ImageViewer
                            imageUrls={imageUrls}
                            enableSwipeDown={true}
                            onSwipeDown={onDismiss}
                            onCancel={onDismiss}
                            backgroundColor="transparent"
                            renderIndicator={() => null}
                            saveToLocalByLongPress={false}
                            style={{ width: windowWidth, height: "100%" }}
                        />
                    ) : (
                        /* VIDEO PLAYER INTERACTION */
                        <View className="w-full h-full justify-center items-center relative bg-slate-950">
                            {/* Simulated Video Frame View */}
                            <View className="w-full h-72 bg-slate-900 justify-center items-center relative border-y border-slate-800">
                                <MaterialDesignIcons
                                    name={isPlaying ? "file-video" : "pause-circle-outline"}
                                    size={80}
                                    color="#ff9933"
                                />
                                <Text className="text-slate-400 text-xs font-semibold mt-2">
                                    {isPlaying ? "Playing Video..." : "Video Paused"}
                                </Text>

                                {/* Play Overlay Center Button */}
                                <TouchableOpacity
                                    onPress={togglePlayPause}
                                    className="absolute p-4 rounded-full bg-carrot-600/90 border-2 border-white/20"
                                >
                                    <MaterialDesignIcons
                                        name={isPlaying ? "pause" : "play"}
                                        size={36}
                                        color="#ffffff"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Controls Bottom Bar */}
                {Boolean(isVideo) && (
                    <View className="w-full bg-slate-900/90 border-t border-slate-800 px-6 py-6 items-center z-20">
                        <View className="w-full max-w-md gap-3">
                            {/* Progress Slider Bar */}
                            <View className="w-full gap-1">
                                <View className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                    <View
                                        className="h-full bg-carrot-500 rounded-full"
                                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    />
                                </View>
                                <View className="flex-row justify-between items-center px-1 mt-1">
                                    <Text className="text-slate-400 text-xs font-medium">
                                        {formatTime(currentTime)}
                                    </Text>
                                    <Text className="text-slate-400 text-xs font-medium">
                                        {formatTime(duration)}
                                    </Text>
                                </View>
                            </View>

                            {/* Playback Control Buttons */}
                            <View className="flex-row items-center justify-around w-full mt-2">
                                {/* Replay / Restart */}
                                <TouchableOpacity
                                    onPress={handleReplay}
                                    className="p-3 bg-slate-800 rounded-full border border-slate-700"
                                >
                                    <MaterialDesignIcons name="restart" size={22} color="#ffffff" />
                                </TouchableOpacity>

                                {/* Rewind 5s */}
                                <TouchableOpacity
                                    onPress={handleRewind5s}
                                    className="p-3 bg-slate-800 rounded-full border border-slate-700"
                                >
                                    <MaterialDesignIcons name="rewind-5" size={24} color="#ffffff" />
                                </TouchableOpacity>

                                {/* Play / Pause Main Toggle */}
                                <TouchableOpacity
                                    onPress={togglePlayPause}
                                    className="p-4 bg-carrot-600 rounded-full border-2 border-carrot-400"
                                >
                                    <MaterialDesignIcons
                                        name={isPlaying ? "pause" : "play"}
                                        size={28}
                                        color="#ffffff"
                                    />
                                </TouchableOpacity>

                                {/* Fast Forward 5s */}
                                <TouchableOpacity
                                    onPress={handleSkip5s}
                                    className="p-3 bg-slate-800 rounded-full border border-slate-700"
                                >
                                    <MaterialDesignIcons name="fast-forward-5" size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

