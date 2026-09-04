import React from "react";
import { View, StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./src/store/store";
import Screens from "./src/utils/Screens";
import "./src/utils/paper-interop";
import "./global.css";

import { PaperProvider, Portal, MD3LightTheme } from "react-native-paper";
import Toast from "./src/components/Toast";
import AuthInitializer from "./src/components/AuthInitializer";

const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: "#ff9933",
        primaryContainer: "#ffdba8",

        // primary: "#4338ca",
        // primaryContainer: "#4338ca",
    },
};

function App() {
    return (
        <ReduxProvider store={store}>
            <PaperProvider theme={theme}>
                <SafeAreaProvider>
                    <NavigationContainer>
                        <View style={styles.container}>
                            <AuthInitializer>
                                <StatusBar
                                    backgroundColor="#ff9933"
                                    barStyle="light-content"
                                />
                                <Screens />
                                <Toast />
                            </AuthInitializer>
                        </View>
                    </NavigationContainer>
                </SafeAreaProvider>
            </PaperProvider>
        </ReduxProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default App;
