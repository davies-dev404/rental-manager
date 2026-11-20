import { createContext, useContext, useState, useEffect } from "react";
import { formatInTimeZone } from 'date-fns-tz';
import { useTheme } from "next-themes";
import { api } from "./api";

const PreferencesContext = createContext(undefined);

const EXCHANGE_RATES = {
  USD: { rate: 1, symbol: "$", digits: 2 },
  EUR: { rate: 0.92, symbol: "€", digits: 2 },
  GBP: { rate: 0.79, symbol: "£", digits: 2 },
  CAD: { rate: 1.35, symbol: "CA$", digits: 2 },
  AUD: { rate: 1.50, symbol: "A$", digits: 2 },
  JPY: { rate: 150.00, symbol: "¥", digits: 0 },
  CNY: { rate: 7.20, symbol: "¥", digits: 2 },
  CHF: { rate: 0.88, symbol: "Fr", digits: 2 },
  KES: { rate: 129.50, symbol: "KSh", digits: 0 },
  UGX: { rate: 3800.00, symbol: "USh", digits: 0 },
  TZS: { rate: 2550.00, symbol: "TSh", digits: 0 },
  RWF: { rate: 1280.00, symbol: "FRw", digits: 0 },
  BIF: { rate: 2850.00, symbol: "FBu", digits: 0 },
  CDF: { rate: 2800.00, symbol: "FC", digits: 0 },
  SSP: { rate: 1600.00, symbol: "SSP", digits: 2 }
};

export function PreferencesProvider({ children }) {
    const { theme, setTheme } = useTheme();
    const [currency, setCurrency] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("rental_currency") || "USD";
        }
        return "USD";
    });
    const [timezone, setTimezone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("rental_timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    });

    useEffect(() => {
        const hasAuthToken = () => {
            try {
                const stored = JSON.parse(localStorage.getItem("rental_user") || "{}");
                return Boolean(stored?.token && stored.token !== "undefined" && stored.token !== "null");
            } catch {
                return false;
            }
        };

        const loadPrefs = async () => {
            if (!hasAuthToken()) {
                const storedCur = localStorage.getItem("rental_currency");
                const storedTZ = localStorage.getItem("rental_timezone");
                if (storedCur) setCurrency(storedCur);
                if (storedTZ) setTimezone(storedTZ);
                return;
            }
            try {
                const settings = await api.getSettings();
                if (settings?.currency) {
                    setCurrency(settings.currency);
                    localStorage.setItem("rental_currency", settings.currency);
                }
                if (settings?.timezone) {
                    setTimezone(settings.timezone);
                    localStorage.setItem("rental_timezone", settings.timezone);
                }
                if (settings?.theme) {
                    setTheme(settings.theme);
                }
            } catch (e) {
                console.warn("Could not load remote preferences, using cached values:", e.message);
                const storedCur = localStorage.getItem("rental_currency");
                const storedTZ = localStorage.getItem("rental_timezone");
                if (storedCur) setCurrency(storedCur);
                if (storedTZ) setTimezone(storedTZ);
            }
        };
        loadPrefs();
    }, [setTheme]);

    const changeCurrency = (code, syncRemote = true) => {
        if (EXCHANGE_RATES[code]) {
            setCurrency(code);
            localStorage.setItem("rental_currency", code);
            if (syncRemote) {
                api.updateSettings({ currency: code }).catch(() => {});
            }
        }
    };

    const changeTimezone = (tz, syncRemote = true) => {
        setTimezone(tz);
        localStorage.setItem("rental_timezone", tz);
        if (syncRemote) {
            api.updateSettings({ timezone: tz }).catch(() => {});
        }
    };

    const changeTheme = (newTheme, syncRemote = true) => {
        setTheme(newTheme);
        if (syncRemote) {
            api.updateSettings({ theme: newTheme }).catch(() => {});
        }
    };

    const formatCurrency = (amount) => {
        const { symbol, digits } = EXCHANGE_RATES[currency];
        return `${symbol} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
    };

    const formatDate = (date, formatStr = 'PPP') => {
        if (!date) return "";
        try {
            return formatInTimeZone(new Date(date), timezone, formatStr);
        } catch (e) {
            return new Date(date).toLocaleDateString();
        }
    };

    return (
        <PreferencesContext.Provider value={{ 
            currency, changeCurrency, formatCurrency, 
            timezone, changeTimezone, formatDate,
            theme, changeTheme,
            currencies: Object.keys(EXCHANGE_RATES) 
        }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
    return context;
}

// Keep aliases for backward compatibility during migration
export const useCurrency = usePreferences;
export const CurrencyProvider = PreferencesProvider;
