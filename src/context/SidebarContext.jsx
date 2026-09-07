import React, { createContext, useContext, useState, useCallback } from "react";

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [sendPushModalOpen, setSendPushModalOpen] = useState(false);

    const openSidebar = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggleSidebar = useCallback((val) => {
        setIsOpen((prev) => (typeof val === "boolean" ? val : !prev));
    }, []);

    const openSendPushModal = useCallback(() => {
        setSendPushModalOpen(true);
    }, []);

    const closeSendPushModal = useCallback(() => {
        setSendPushModalOpen(false);
    }, []);

    return (
        <SidebarContext.Provider
            value={{
                isOpen,
                openSidebar,
                closeSidebar,
                toggleSidebar,
                sendPushModalOpen,
                openSendPushModal,
                closeSendPushModal,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export default SidebarContext;
