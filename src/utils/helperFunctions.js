export const fileToBase64 = async (uri) => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Base64 Conversion Error:", error);
        return null;
    }
};

/**
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} Returns the new debounced function.
 */
export const debounce = (func, delay = 500) => {
    let timeoutId;
    const debounced = function (...args) {
        const context = this;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
    debounced.cancel = () => {
        clearTimeout(timeoutId);
    };
    return debounced;
};
