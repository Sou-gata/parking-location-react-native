import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import Home from "../pages/Home";
import Login from "../pages/Login";
import OrgSignup from "../pages/OrgSignup";
import UserSignup from "../pages/UserSignup";
import ManageUsers from "../pages/ManageUsers";
import MyBookings from "../pages/MyBookings";
import CheckInOut from "../pages/CheckInOut";
import ManageParking from "../pages/ManageParking";
import Profile from "../pages/Profile";
import Wallet from "../pages/Wallet";
import SuperAdminSettings from "../pages/SuperAdminSettings";

const Stack = createNativeStackNavigator();

const Screens = () => {
    const isLoggedIn = useSelector((state) => state.user.isLoggedIn);

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: "#4338ca",
                },
                headerTintColor: "#fff",
                headerTitleStyle: {
                    fontWeight: "bold",
                },
            }}
        >
            {isLoggedIn ? (
                <>
                    <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
                    <Stack.Screen
                        name="ManageUsers"
                        component={ManageUsers}
                        options={{
                            title: "Manage Users",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="MyBookings"
                        component={MyBookings}
                        options={{
                            title: "My Bookings",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="CheckInOut"
                        component={CheckInOut}
                        options={{
                            title: "Check In / Out",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="ManageParking"
                        component={ManageParking}
                        options={{
                            title: "Manage Parking",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="Profile"
                        component={Profile}
                        options={{
                            title: "My Profile",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="Wallet"
                        component={Wallet}
                        options={{
                            title: "My Wallet",
                            headerBackTitle: "Back",
                        }}
                    />
                    <Stack.Screen
                        name="SuperAdminSettings"
                        component={SuperAdminSettings}
                        options={{
                            title: "Settings",
                            headerBackTitle: "Back",
                        }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                    <Stack.Screen
                        name="OrgSignup"
                        component={OrgSignup}
                        options={{
                            headerShown: false,
                            headerBackVisible: false,
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen
                        name="UserSignup"
                        component={UserSignup}
                        options={{
                            headerShown: false,
                            headerBackVisible: false,
                            gestureEnabled: false,
                        }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
};

export default Screens;
