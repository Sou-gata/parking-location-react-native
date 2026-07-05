/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#4338ca",
            },
        },
    },
    plugins: [],
};
