import React from "react";
import { View, FlatList, Text } from "react-native";
import { Card, Avatar, Badge, Divider, IconButton, Button } from "react-native-paper";
import { ROLES, ROLE_DISPLAY_NAMES } from "../../utils/rbacConfig";

export default function EmployeeRosterList({
    employees,
    currentSelectedAgency,
    role,
    onToggleStatus,
    onEditEmployee,
    onDeleteEmployee,
    onOpenRoleModal,
    onOpenEditAgency,
    onOpenAddEmployee,
    onOpenAgencyDetails,
}) {
    return (
        <FlatList
            data={employees}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const isBlocked = item.status === "blocked";
                const isOwnerAdmin = item.role === ROLES.AGENCY_ADMIN;
                return (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    <Avatar.Text
                                        size={46}
                                        label={(item.name || "")
                                            .substring(0, 2)
                                            .toUpperCase()}
                                        style={{
                                            backgroundColor: isBlocked
                                                ? "#f1f5f9"
                                                : "#e0e7ff",
                                        }}
                                        labelStyle={{
                                            color: isBlocked
                                                ? "#64748b"
                                                : "#4338ca",
                                            fontWeight: "bold",
                                        }}
                                    />
                                    <View className="ml-3 flex-1">
                                        <View className="flex-row items-center gap-1.5 flex-wrap">
                                            <Text
                                                className={`text-base font-bold ${
                                                    isBlocked
                                                        ? "text-slate-400 line-through"
                                                        : "text-slate-800"
                                                }`}
                                                numberOfLines={1}
                                            >
                                                {item.name}
                                            </Text>
                                            {isBlocked && (
                                                <Badge className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                                    Blocked
                                                </Badge>
                                            )}
                                        </View>
                                        <Text className="text-xs text-slate-500">
                                            @{item.username} • {item.phone_number || "No Phone"}
                                        </Text>
                                    </View>
                                </View>
                                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs">
                                    {ROLE_DISPLAY_NAMES[item.role] || "Customer"}
                                </Badge>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="flex-row justify-between items-center flex-wrap gap-2">
                                <Text
                                    className={`text-sm ${
                                        isBlocked
                                            ? "text-slate-400"
                                            : "text-slate-600"
                                    }`}
                                >
                                    {item.email}
                                </Text>

                                {/* Row of Action Buttons */}
                                <View className="flex-row gap-1">
                                    {/* Block / Unblock (Except Owner Admin) */}
                                    {!isOwnerAdmin && (
                                        <IconButton
                                            icon={
                                                isBlocked
                                                    ? "lock-open-outline"
                                                    : "block-helper"
                                            }
                                            iconColor={
                                                isBlocked
                                                    ? "#16a34a"
                                                    : "#dc2626"
                                            }
                                            size={18}
                                            style={{ margin: 0 }}
                                            onPress={() => onToggleStatus(item)}
                                        />
                                    )}

                                    {/* Edit Employee (Only for Agency Admin & Superuser) */}
                                    {(role === ROLES.AGENCY_ADMIN ||
                                        role === ROLES.SUPER_ADMIN) && (
                                        <IconButton
                                            icon="account-edit-outline"
                                            iconColor="#4338ca"
                                            size={18}
                                            style={{ margin: 0 }}
                                            onPress={() => onEditEmployee(item)}
                                            disabled={isBlocked}
                                        />
                                    )}

                                    {/* Delete Employee (Except Owner Admin) */}
                                    {!isOwnerAdmin &&
                                        (role === ROLES.AGENCY_ADMIN ||
                                            role === ROLES.SUPER_ADMIN) && (
                                            <IconButton
                                                icon="trash-can-outline"
                                                iconColor="#ef4444"
                                                size={18}
                                                style={{ margin: 0 }}
                                                onPress={() =>
                                                    onDeleteEmployee(
                                                        item.id,
                                                        item.name
                                                    )
                                                }
                                            />
                                        )}

                                    {/* Quick Role switch modal */}
                                    <IconButton
                                        icon="shield-key-outline"
                                        iconColor="#64748b"
                                        size={18}
                                        style={{ margin: 0 }}
                                        onPress={() => onOpenRoleModal(item)}
                                        disabled={isBlocked}
                                    />
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                );
            }}
            ListHeaderComponent={
                <Card
                    className="mb-4 bg-white border border-slate-100 rounded-xl"
                    elevation={0}
                >
                    <Card.Content className="py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <View className="flex-row justify-between items-start">
                            <View style={{ flex: 1 }}>
                                <Text className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
                                    {role === ROLES.SUPER_ADMIN
                                        ? "Selected Agency Profile"
                                        : "My Agency Profile"}
                                </Text>
                                <Text className="text-lg font-bold text-slate-800">
                                    {currentSelectedAgency?.name}
                                </Text>
                                <Text className="text-sm text-slate-600 mt-1">
                                    <Text className="font-semibold">Owner Admin: </Text>
                                    {currentSelectedAgency?.owner}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Address: </Text>
                                    {currentSelectedAgency?.address}
                                </Text>
                            </View>
                            <View className="flex-row">
                                {/* Super Admin can view and edit the agency profile details */}
                                {role === ROLES.SUPER_ADMIN && (
                                    <View className="flex-row">
                                        <IconButton
                                            icon="eye-outline"
                                            iconColor="#4338ca"
                                            size={20}
                                            style={{ marginRight: -4 }}
                                            onPress={() => onOpenAgencyDetails(currentSelectedAgency)}
                                        />
                                        <IconButton
                                            icon="pencil-outline"
                                            iconColor="#4338ca"
                                            size={20}
                                            onPress={() => onOpenEditAgency(currentSelectedAgency)}
                                        />
                                    </View>
                                )}
                                {/* Agency Admin can register new employees */}
                                {role === ROLES.AGENCY_ADMIN && (
                                    <Button
                                        mode="contained"
                                        compact
                                        onPress={onOpenAddEmployee}
                                        buttonColor="#4338ca"
                                        className="rounded-lg self-center"
                                        labelStyle={{
                                            color: "white",
                                            fontSize: 11,
                                            fontWeight: "700",
                                        }}
                                    >
                                        Add Staff
                                    </Button>
                                )}
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            }
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="account-multiple-outline"
                        style={{ backgroundColor: "#f8fafc" }}
                        color="#64748b"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        No Employees Found
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        There are no users matching your role filter or query.
                    </Text>
                </View>
            }
        />
    );
}
