/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                carrot: {
                    50: "#fff8ed",
                    100: "#ffefd4",
                    200: "#ffdba8",
                    300: "#ffc171",
                    400: "#ff9933",
                    500: "#fe7e11",
                    600: "#ef6207",
                    700: "#c64908",
                    800: "#9d3a0f",
                    900: "#7e3110",
                    950: "#441706",
                },
                primary: {
                    DEFAULT: "#ff9933",
                    50: "#fff8ed",
                    100: "#ffefd4",
                    200: "#ffdba8",
                    300: "#ffc171",
                    400: "#ff9933",
                    500: "#fe7e11",
                    600: "#ef6207",
                    700: "#c64908",
                    800: "#9d3a0f",
                    900: "#7e3110",
                    950: "#441706",
                },
            },
        },
    },
    plugins: [],
};
