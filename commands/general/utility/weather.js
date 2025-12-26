import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";

class WeatherCommand extends Command {
    async run() {
        this.success = false;
        const location = this.getOptionString("location", true);

        if (!location) {
            return "❌ Gabe says: Tell me where you want to check the weather, genius.";
        }

        await this.acknowledge();

        try {
            // Step 1: Geocode the location
            const geoResponse = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
            );

            if (!geoResponse.ok) {
                return "❌ Gabe says: Couldn't look up that location. Try again later.";
            }

            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                return `❌ Gabe says: I couldn't find "${location}". Check your spelling or try a bigger city nearby.`;
            }

            const place = geoData.results[0];
            const { latitude, longitude, name, admin1, country } = place;

            // Step 2: Get weather data
            const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=celsius&wind_speed_unit=kmh`
            );

            if (!weatherResponse.ok) {
                return "❌ Gabe says: Couldn't fetch weather data. Try again later.";
            }

            const weatherData = await weatherResponse.json();
            const current = weatherData.current;

            // Weather code interpretations
            const weatherCodes = {
                0: { emoji: "☀️", desc: "Clear sky" },
                1: { emoji: "🌤️", desc: "Mainly clear" },
                2: { emoji: "⛅", desc: "Partly cloudy" },
                3: { emoji: "☁️", desc: "Overcast" },
                45: { emoji: "🌫️", desc: "Fog" },
                48: { emoji: "🌫️", desc: "Depositing rime fog" },
                51: { emoji: "🌧️", desc: "Light drizzle" },
                53: { emoji: "🌧️", desc: "Moderate drizzle" },
                55: { emoji: "🌧️", desc: "Dense drizzle" },
                61: { emoji: "🌧️", desc: "Slight rain" },
                63: { emoji: "🌧️", desc: "Moderate rain" },
                65: { emoji: "🌧️", desc: "Heavy rain" },
                66: { emoji: "🌨️", desc: "Light freezing rain" },
                67: { emoji: "🌨️", desc: "Heavy freezing rain" },
                71: { emoji: "🌨️", desc: "Slight snow" },
                73: { emoji: "🌨️", desc: "Moderate snow" },
                75: { emoji: "❄️", desc: "Heavy snow" },
                77: { emoji: "🌨️", desc: "Snow grains" },
                80: { emoji: "🌧️", desc: "Slight rain showers" },
                81: { emoji: "🌧️", desc: "Moderate rain showers" },
                82: { emoji: "🌧️", desc: "Violent rain showers" },
                85: { emoji: "🌨️", desc: "Slight snow showers" },
                86: { emoji: "❄️", desc: "Heavy snow showers" },
                95: { emoji: "⛈️", desc: "Thunderstorm" },
                96: { emoji: "⛈️", desc: "Thunderstorm with slight hail" },
                99: { emoji: "⛈️", desc: "Thunderstorm with heavy hail" },
            };

            const weatherInfo = weatherCodes[current.weather_code] || { emoji: "🌡️", desc: "Unknown" };
            const locationStr = [name, admin1, country].filter(Boolean).join(", ");

            // Wind direction to cardinal
            const windDeg = current.wind_direction_10m;
            const windDirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
            const windDir = windDirs[Math.round(windDeg / 45) % 8];

            // Temperature color based on value
            const temp = current.temperature_2m;
            let tempColor = 0x3498db; // Blue (cold)
            if (temp >= 10 && temp < 20) tempColor = 0x2ecc71; // Green (mild)
            else if (temp >= 20 && temp < 30) tempColor = 0xf39c12; // Orange (warm)
            else if (temp >= 30) tempColor = 0xe74c3c; // Red (hot)

            this.success = true;
            return {
                embeds: [
                    {
                        color: tempColor,
                        title: `${weatherInfo.emoji} Weather for ${locationStr}`,
                        fields: [
                            {
                                name: "🌡️ Temperature",
                                value: `**${temp}°C** (feels like ${current.apparent_temperature}°C)`,
                                inline: true,
                            },
                            {
                                name: "💧 Humidity",
                                value: `${current.relative_humidity_2m}%`,
                                inline: true,
                            },
                            {
                                name: "💨 Wind",
                                value: `${current.wind_speed_10m} km/h ${windDir}`,
                                inline: true,
                            },
                            {
                                name: "📋 Conditions",
                                value: weatherInfo.desc,
                                inline: true,
                            },
                        ],
                        footer: {
                            text: "Data from Open-Meteo • Response only visible to you",
                        },
                        timestamp: new Date().toISOString(),
                    },
                ],
            };
        } catch (error) {
            return `❌ Gabe says: Something went wrong fetching weather. ${error.message}`;
        }
    }

    static flags = [
        {
            name: "location",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            description: "City name or location to get weather for",
            required: true,
        },
    ];

    static description = "Get current weather for a location (private response)";
    static aliases = ["w", "forecast"];
    static ephemeral = true;
}

export default WeatherCommand;
