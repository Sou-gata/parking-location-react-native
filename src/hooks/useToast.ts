import { useDispatch } from "react-redux";
import { showToast, ToastType } from "../store/slices/toastSlice";

interface ToastMethods {
    success: (message: string, title?: string, showHeading?: boolean) => void;
    info: (message: string, title?: string, showHeading?: boolean) => void;
    warning: (message: string, title?: string, showHeading?: boolean) => void;
    danger: (message: string, title?: string, showHeading?: boolean) => void;
    error: (message: string, title?: string, showHeading?: boolean) => void;
}

export default function useToast(): ToastMethods {
    const dispatch = useDispatch();

    const toast: ToastMethods = {
        success: (message, title, showHeading) =>
            dispatch(showToast({ message, title, type: "success", showHeading })),
        info: (message, title, showHeading) =>
            dispatch(showToast({ message, title, type: "info", showHeading })),
        warning: (message, title, showHeading) =>
            dispatch(showToast({ message, title, type: "warning", showHeading })),
        danger: (message, title, showHeading) =>
            dispatch(showToast({ message, title, type: "danger", showHeading })),
        error: (message, title, showHeading) =>
            dispatch(showToast({ message, title, type: "danger", showHeading })),
    };

    return toast;
}
