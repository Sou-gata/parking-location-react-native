import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, Card, Button, Badge, IconButton } from "react-native-paper";
import ImageCropPicker from "react-native-image-crop-picker";
import { Image as ImageCompressor, Video as VideoCompressor } from "react-native-compressor";
import apiService from "../../utils/apiService";
import { imageBaseURL } from "../../utils/baseURL";
import useToast from "../../hooks/useToast";
import MediaViewerModal from "../MediaViewerModal";

export default function MediaTab({ agencyId }) {
    const toast = useToast();
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    const fetchMedia = useCallback(async () => {
        if (!agencyId) return;
        setLoading(true);
        try {
            const response = await apiService.get(`agencies/${agencyId}/media`);
            if (response && response.success) {
                setMediaItems(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching agency media:", error);
            toast.error("Failed to load agency media", "Error", true);
        } finally {
            setLoading(false);
        }
    }, [agencyId]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const handleAddMedia = async () => {
        if (mediaItems.length >= 10) {
            toast.error("Maximum 10 photos/videos allowed per organization.", "Limit Reached", true);
            return;
        }

        try {
            const picked = await ImageCropPicker.openPicker({
                mediaType: "any",
                compressImageQuality: 0.9,
            });

            if (picked && picked.path) {
                const isVideo =
                    picked.mime?.startsWith("video") ||
                    /\.(mp4|mov|avi|mkv|webm)$/i.test(picked.path);

                if (isVideo) {
                    let durationSec = 0;
                    if (picked.duration) {
                        durationSec = picked.duration / 1000;
                    } else {
                        try {
                            const meta = await VideoCompressor.getVideoMetaData(picked.path);
                            durationSec = meta.duration;
                        } catch (e) {}
                    }

                    if (durationSec > 45) {
                        toast.error("Video duration must not exceed 45 seconds.", "Video Too Long", true);
                        return;
                    }

                    setUploading(true);
                    toast.info("Compressing video...", "Please Wait", true);
                    const compressedUri = await VideoCompressor.compress(picked.path, {
                        compressionMethod: "auto",
                    });

                    const formData = new FormData();
                    formData.append("media", {
                        uri: compressedUri,
                        name: `media_${Date.now()}.mp4`,
                        type: picked.mime || "video/mp4",
                    });

                    await apiService.post(`agencies/${agencyId}/media`, formData);
                    toast.success("Video uploaded for approval!", "Success", true);
                } else {
                    setUploading(true);
                    const compressedUri = await ImageCompressor.compress(picked.path, {
                        compressionMethod: "auto",
                        quality: 0.8,
                    });

                    const formData = new FormData();
                    formData.append("media", {
                        uri: compressedUri,
                        name: `media_${Date.now()}.jpg`,
                        type: picked.mime || "image/jpeg",
                    });

                    await apiService.post(`agencies/${agencyId}/media`, formData);
                    toast.success("Photo uploaded for approval!", "Success", true);
                }
                fetchMedia();
            }
        } catch (error) {
            if (error?.code !== "E_PICKER_CANCELLED") {
                console.error("Add Media Error:", error);
                toast.error("Failed to upload photo/video.", "Error", true);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleReplaceMedia = async (mediaId, currentType) => {
        try {
            const picked = await ImageCropPicker.openPicker({
                mediaType: currentType === "video" ? "video" : "photo",
                compressImageQuality: 0.9,
            });

            if (picked && picked.path) {
                const isVideo =
                    currentType === "video" ||
                    picked.mime?.startsWith("video") ||
                    /\.(mp4|mov|avi|mkv|webm)$/i.test(picked.path);

                if (isVideo) {
                    let durationSec = 0;
                    if (picked.duration) {
                        durationSec = picked.duration / 1000;
                    } else {
                        try {
                            const meta = await VideoCompressor.getVideoMetaData(picked.path);
                            durationSec = meta.duration;
                        } catch (e) {}
                    }

                    if (durationSec > 45) {
                        toast.error("Video duration must not exceed 45 seconds.", "Video Too Long", true);
                        return;
                    }

                    setUploading(true);
                    toast.info("Compressing video...", "Please Wait", true);
                    const compressedUri = await VideoCompressor.compress(picked.path, {
                        compressionMethod: "auto",
                    });

                    const formData = new FormData();
                    formData.append("media", {
                        uri: compressedUri,
                        name: `media_${Date.now()}.mp4`,
                        type: picked.mime || "video/mp4",
                    });

                    await apiService.put(`agencies/media/${mediaId}`, formData);
                    toast.success("Replacement submitted for approval!", "Success", true);
                } else {
                    setUploading(true);
                    const compressedUri = await ImageCompressor.compress(picked.path, {
                        compressionMethod: "auto",
                        quality: 0.8,
                    });

                    const formData = new FormData();
                    formData.append("media", {
                        uri: compressedUri,
                        name: `media_${Date.now()}.jpg`,
                        type: picked.mime || "image/jpeg",
                    });

                    await apiService.put(`agencies/media/${mediaId}`, formData);
                    toast.success("Replacement submitted for approval!", "Success", true);
                }
                fetchMedia();
            }
        } catch (error) {
            if (error?.code !== "E_PICKER_CANCELLED") {
                console.error("Replace Media Error:", error);
                toast.error("Failed to replace photo/video.", "Error", true);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        try {
            await apiService.delete(`agencies/media/${mediaId}`);
            toast.success("Media deleted.", "Success", true);
            fetchMedia();
        } catch (error) {
            console.error("Delete Media Error:", error);
            toast.error("Failed to delete media.", "Error", true);
        }
    };

    if (loading) {
        return (
            <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#4338ca" />
                <Text className="text-gray-500 mt-2 text-xs font-semibold">Loading media gallery...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 p-4 bg-slate-50">
            {/* Header info card */}
            <Card className="mb-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl" elevation={0}>
                <Card.Content className="p-4">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-lg font-bold text-indigo-900">Organization Photos & Videos</Text>
                        <Badge className="bg-indigo-600 text-white font-bold px-2">{mediaItems.length}/10</Badge>
                    </View>
                    <Text className="text-xs text-indigo-700 leading-5">
                        Upload up to 10 photos or videos (videos max 45s). Newly uploaded or edited items are set to{" "}
                        <Text className="font-bold text-amber-700">Pending</Text> until Super Admin approves them.
                    </Text>
                    {uploading && (
                        <View className="flex-row items-center mt-3 gap-2">
                            <ActivityIndicator size="small" color="#4338ca" />
                            <Text className="text-xs font-bold text-indigo-800">Processing & Compressing media...</Text>
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Add Media Button */}
            <TouchableOpacity
                onPress={handleAddMedia}
                disabled={uploading || mediaItems.length >= 10}
                activeOpacity={0.7}
                className="mb-6 p-4 border-dashed border-2 border-indigo-300 bg-white rounded-2xl items-center justify-center flex-row gap-2"
            >
                <IconButton icon="plus-circle-outline" iconColor="#4338ca" size={24} />
                <Text className="font-bold text-indigo-900 text-sm">
                    Upload New Photo / Video (Max 45s)
                </Text>
            </TouchableOpacity>

            {/* Media List */}
            {mediaItems.length > 0 ? (
                <View className="flex-row flex-wrap justify-between gap-y-4 pb-8">
                    {mediaItems.map((item) => {
                        const displayUrl = getImageUrl(item.pending_file_path || item.file_path);
                        const isPending = item.status === "pending";
                        const isApproved = item.status === "approved";
                        const isRejected = item.status === "rejected";

                        return (
                            <Card
                                key={item.media_id}
                                className="w-[48%] bg-white border border-slate-200 rounded-2xl overflow-hidden"
                                elevation={1}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        setViewerState({
                                            visible: true,
                                            media: {
                                                uri: displayUrl,
                                                type: item.file_type,
                                                title: `${item.file_type === "video" ? "Video" : "Photo"} (Status: ${item.status})`,
                                            },
                                        })
                                    }
                                    className="relative w-full h-36 bg-slate-900 items-center justify-center"
                                >
                                    {item.file_type === "photo" ? (
                                        <Image source={{ uri: displayUrl }} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <View className="items-center justify-center w-full h-full bg-slate-900/90">
                                            <IconButton icon="play-circle" iconColor="#ffffff" size={40} />
                                            <Text className="text-white text-xs font-bold">Video (Max 45s)</Text>
                                        </View>
                                    )}

                                    <Badge
                                        className={`absolute top-2 left-2 ${
                                            isApproved
                                                ? "bg-green-600 text-white"
                                                : isRejected
                                                ? "bg-red-600 text-white"
                                                : "bg-amber-500 text-white"
                                        }`}
                                    >
                                        {isPending && item.pending_file_path ? "EDIT PENDING" : item.status.toUpperCase()}
                                    </Badge>
                                </TouchableOpacity>

                                <Card.Content className="p-3 gap-2">
                                    {isPending && (
                                        <Text className="text-[10px] text-amber-700 font-semibold text-center">
                                            Awaiting Super Admin approval
                                        </Text>
                                    )}
                                    {isRejected && item.rejection_reason && (
                                        <Text className="text-[10px] text-red-600 font-semibold text-center">
                                            Reason: {item.rejection_reason}
                                        </Text>
                                    )}

                                    <View className="flex-row justify-between gap-2 mt-1">
                                        <Button
                                            mode="outlined"
                                            compact
                                            className="flex-1 rounded-xl border-indigo-200"
                                            textColor="#4338ca"
                                            labelStyle={{ fontSize: 10, fontWeight: "bold" }}
                                            onPress={() => handleReplaceMedia(item.media_id, item.file_type)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            compact
                                            className="flex-1 rounded-xl border-red-200"
                                            textColor="#dc2626"
                                            labelStyle={{ fontSize: 10, fontWeight: "bold" }}
                                            onPress={() => handleDeleteMedia(item.media_id)}
                                        >
                                            Delete
                                        </Button>
                                    </View>
                                </Card.Content>
                            </Card>
                        );
                    })}
                </View>
            ) : (
                <View className="py-12 items-center justify-center border border-dashed border-slate-300 rounded-2xl bg-white">
                    <IconButton icon="image-multiple-outline" size={40} iconColor="#94a3b8" />
                    <Text className="text-gray-500 font-bold text-sm">No photos or videos uploaded yet</Text>
                    <Text className="text-gray-400 text-xs mt-1 text-center px-4">
                        Tap above to upload organization photos or videos for users to view when booking.
                    </Text>
                </View>
            )}

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() => setViewerState({ visible: false, media: null })}
                media={viewerState.media}
            />
        </ScrollView>
    );
}
