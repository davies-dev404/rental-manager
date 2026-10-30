import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export const WORLD_COUNTRIES = [
  { code: "AF", dial: "+93", name: "Afghanistan" },
  { code: "AL", dial: "+355", name: "Albania" },
  { code: "DZ", dial: "+213", name: "Algeria" },
  { code: "AD", dial: "+376", name: "Andorra" },
  { code: "AO", dial: "+244", name: "Angola" },
  { code: "AG", dial: "+1268", name: "Antigua and Barbuda" },
  { code: "AR", dial: "+54", name: "Argentina" },
  { code: "AM", dial: "+374", name: "Armenia" },
  { code: "AU", dial: "+61", name: "Australia" },
  { code: "AT", dial: "+43", name: "Austria" },
  { code: "AZ", dial: "+994", name: "Azerbaijan" },
  { code: "BS", dial: "+1242", name: "Bahamas" },
  { code: "BH", dial: "+973", name: "Bahrain" },
  { code: "BD", dial: "+880", name: "Bangladesh" },
  { code: "BB", dial: "+1246", name: "Barbados" },
  { code: "BY", dial: "+375", name: "Belarus" },
  { code: "BE", dial: "+32", name: "Belgium" },
  { code: "BZ", dial: "+501", name: "Belize" },
  { code: "BJ", dial: "+229", name: "Benin" },
  { code: "BT", dial: "+975", name: "Bhutan" },
  { code: "BO", dial: "+591", name: "Bolivia" },
  { code: "BA", dial: "+387", name: "Bosnia and Herzegovina" },
  { code: "BW", dial: "+267", name: "Botswana" },
  { code: "BR", dial: "+55", name: "Brazil" },
  { code: "BN", dial: "+673", name: "Brunei" },
  { code: "BG", dial: "+359", name: "Bulgaria" },
  { code: "BF", dial: "+226", name: "Burkina Faso" },
  { code: "BI", dial: "+257", name: "Burundi" },
  { code: "CV", dial: "+238", name: "Cabo Verde" },
  { code: "KH", dial: "+855", name: "Cambodia" },
  { code: "CM", dial: "+237", name: "Cameroon" },
  { code: "CA", dial: "+1", name: "Canada" },
  { code: "CF", dial: "+236", name: "Central African Republic" },
  { code: "TD", dial: "+235", name: "Chad" },
  { code: "CL", dial: "+56", name: "Chile" },
  { code: "CN", dial: "+86", name: "China" },
  { code: "CO", dial: "+57", name: "Colombia" },
  { code: "KM", dial: "+269", name: "Comoros" },
  { code: "CG", dial: "+242", name: "Congo" },
  { code: "CD", dial: "+243", name: "Congo (DRC)" },
  { code: "CR", dial: "+506", name: "Costa Rica" },
  { code: "CI", dial: "+225", name: "Côte d'Ivoire" },
  { code: "HR", dial: "+385", name: "Croatia" },
  { code: "CU", dial: "+53", name: "Cuba" },
  { code: "CY", dial: "+357", name: "Cyprus" },
  { code: "CZ", dial: "+420", name: "Czech Republic" },
  { code: "DK", dial: "+45", name: "Denmark" },
  { code: "DJ", dial: "+253", name: "Djibouti" },
  { code: "DM", dial: "+1767", name: "Dominica" },
  { code: "DO", dial: "+1809", name: "Dominican Republic" },
  { code: "EC", dial: "+593", name: "Ecuador" },
  { code: "EG", dial: "+20", name: "Egypt" },
  { code: "SV", dial: "+503", name: "El Salvador" },
  { code: "GQ", dial: "+240", name: "Equatorial Guinea" },
  { code: "ER", dial: "+291", name: "Eritrea" },
  { code: "EE", dial: "+372", name: "Estonia" },
  { code: "SZ", dial: "+268", name: "Eswatini" },
  { code: "ET", dial: "+251", name: "Ethiopia" },
  { code: "FJ", dial: "+679", name: "Fiji" },
  { code: "FI", dial: "+358", name: "Finland" },
  { code: "FR", dial: "+33", name: "France" },
  { code: "GA", dial: "+241", name: "Gabon" },
  { code: "GM", dial: "+220", name: "Gambia" },
  { code: "GE", dial: "+995", name: "Georgia" },
  { code: "DE", dial: "+49", name: "Germany" },
  { code: "GH", dial: "+233", name: "Ghana" },
  { code: "GR", dial: "+30", name: "Greece" },
  { code: "GD", dial: "+1473", name: "Grenada" },
  { code: "GT", dial: "+502", name: "Guatemala" },
  { code: "GN", dial: "+224", name: "Guinea" },
  { code: "GW", dial: "+245", name: "Guinea-Bissau" },
  { code: "GY", dial: "+592", name: "Guyana" },
  { code: "HT", dial: "+509", name: "Haiti" },
  { code: "HN", dial: "+504", name: "Honduras" },
  { code: "HK", dial: "+852", name: "Hong Kong" },
  { code: "HU", dial: "+36", name: "Hungary" },
  { code: "IS", dial: "+354", name: "Iceland" },
  { code: "IN", dial: "+91", name: "India" },
  { code: "ID", dial: "+62", name: "Indonesia" },
  { code: "IR", dial: "+98", name: "Iran" },
  { code: "IQ", dial: "+964", name: "Iraq" },
  { code: "IE", dial: "+353", name: "Ireland" },
  { code: "IL", dial: "+972", name: "Israel" },
  { code: "IT", dial: "+39", name: "Italy" },
  { code: "JM", dial: "+1876", name: "Jamaica" },
  { code: "JP", dial: "+81", name: "Japan" },
  { code: "JO", dial: "+962", name: "Jordan" },
  { code: "KZ", dial: "+7", name: "Kazakhstan" },
  { code: "KE", dial: "+254", name: "Kenya" },
  { code: "KI", dial: "+686", name: "Kiribati" },
  { code: "KW", dial: "+965", name: "Kuwait" },
  { code: "KG", dial: "+996", name: "Kyrgyzstan" },
  { code: "LA", dial: "+856", name: "Laos" },
  { code: "LV", dial: "+371", name: "Latvia" },
  { code: "LB", dial: "+961", name: "Lebanon" },
  { code: "LS", dial: "+266", name: "Lesotho" },
  { code: "LR", dial: "+231", name: "Liberia" },
  { code: "LY", dial: "+218", name: "Libya" },
  { code: "LI", dial: "+423", name: "Liechtenstein" },
  { code: "LT", dial: "+370", name: "Lithuania" },
  { code: "LU", dial: "+352", name: "Luxembourg" },
  { code: "MO", dial: "+853", name: "Macau" },
  { code: "MG", dial: "+261", name: "Madagascar" },
  { code: "MW", dial: "+265", name: "Malawi" },
  { code: "MY", dial: "+60", name: "Malaysia" },
  { code: "MV", dial: "+960", name: "Maldives" },
  { code: "ML", dial: "+223", name: "Mali" },
  { code: "MT", dial: "+356", name: "Malta" },
  { code: "MR", dial: "+222", name: "Mauritania" },
  { code: "MU", dial: "+230", name: "Mauritius" },
  { code: "MX", dial: "+52", name: "Mexico" },
  { code: "MD", dial: "+373", name: "Moldova" },
  { code: "MC", dial: "+377", name: "Monaco" },
  { code: "MN", dial: "+976", name: "Mongolia" },
  { code: "ME", dial: "+382", name: "Montenegro" },
  { code: "MA", dial: "+212", name: "Morocco" },
  { code: "MZ", dial: "+258", name: "Mozambique" },
  { code: "MM", dial: "+95", name: "Myanmar" },
  { code: "NA", dial: "+264", name: "Namibia" },
  { code: "NR", dial: "+674", name: "Nauru" },
  { code: "NP", dial: "+977", name: "Nepal" },
  { code: "NL", dial: "+31", name: "Netherlands" },
  { code: "NZ", dial: "+64", name: "New Zealand" },
  { code: "NI", dial: "+505", name: "Nicaragua" },
  { code: "NE", dial: "+227", name: "Niger" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "KP", dial: "+850", name: "North Korea" },
  { code: "MK", dial: "+389", name: "North Macedonia" },
  { code: "NO", dial: "+47", name: "Norway" },
  { code: "OM", dial: "+968", name: "Oman" },
  { code: "PK", dial: "+92", name: "Pakistan" },
  { code: "PS", dial: "+970", name: "Palestine" },
  { code: "PA", dial: "+507", name: "Panama" },
  { code: "PG", dial: "+675", name: "Papua New Guinea" },
  { code: "PY", dial: "+595", name: "Paraguay" },
  { code: "PE", dial: "+51", name: "Peru" },
  { code: "PH", dial: "+63", name: "Philippines" },
  { code: "PL", dial: "+48", name: "Poland" },
  { code: "PT", dial: "+351", name: "Portugal" },
  { code: "QA", dial: "+974", name: "Qatar" },
  { code: "RO", dial: "+40", name: "Romania" },
  { code: "RU", dial: "+7", name: "Russia" },
  { code: "RW", dial: "+250", name: "Rwanda" },
  { code: "KN", dial: "+1869", name: "Saint Kitts and Nevis" },
  { code: "LC", dial: "+1758", name: "Saint Lucia" },
  { code: "VC", dial: "+1784", name: "Saint Vincent and the Grenadines" },
  { code: "WS", dial: "+685", name: "Samoa" },
  { code: "SM", dial: "+378", name: "San Marino" },
  { code: "ST", dial: "+239", name: "Sao Tome and Principe" },
  { code: "SA", dial: "+966", name: "Saudi Arabia" },
  { code: "SN", dial: "+221", name: "Senegal" },
  { code: "RS", dial: "+381", name: "Serbia" },
  { code: "SC", dial: "+248", name: "Seychelles" },
  { code: "SL", dial: "+232", name: "Sierra Leone" },
  { code: "SG", dial: "+65", name: "Singapore" },
  { code: "SK", dial: "+421", name: "Slovakia" },
  { code: "SI", dial: "+386", name: "Slovenia" },
  { code: "SB", dial: "+677", name: "Solomon Islands" },
  { code: "SO", dial: "+252", name: "Somalia" },
  { code: "ZA", dial: "+27", name: "South Africa" },
  { code: "KR", dial: "+82", name: "South Korea" },
  { code: "SS", dial: "+211", name: "South Sudan" },
  { code: "ES", dial: "+34", name: "Spain" },
  { code: "LK", dial: "+94", name: "Sri Lanka" },
  { code: "SD", dial: "+249", name: "Sudan" },
  { code: "SR", dial: "+597", name: "Suriname" },
  { code: "SE", dial: "+46", name: "Sweden" },
  { code: "CH", dial: "+41", name: "Switzerland" },
  { code: "SY", dial: "+963", name: "Syria" },
  { code: "TW", dial: "+886", name: "Taiwan" },
  { code: "TJ", dial: "+992", name: "Tajikistan" },
  { code: "TZ", dial: "+255", name: "Tanzania" },
  { code: "TH", dial: "+66", name: "Thailand" },
  { code: "TL", dial: "+670", name: "Timor-Leste" },
  { code: "TG", dial: "+228", name: "Togo" },
  { code: "TO", dial: "+676", name: "Tonga" },
  { code: "TT", dial: "+1868", name: "Trinidad and Tobago" },
  { code: "TN", dial: "+216", name: "Tunisia" },
  { code: "TR", dial: "+90", name: "Turkey" },
  { code: "TM", dial: "+993", name: "Turkmenistan" },
  { code: "TV", dial: "+688", name: "Tuvalu" },
  { code: "UG", dial: "+256", name: "Uganda" },
  { code: "UA", dial: "+380", name: "Ukraine" },
  { code: "AE", dial: "+971", name: "United Arab Emirates" },
  { code: "GB", dial: "+44", name: "United Kingdom" },
  { code: "US", dial: "+1", name: "United States" },
  { code: "UY", dial: "+598", name: "Uruguay" },
  { code: "UZ", dial: "+998", name: "Uzbekistan" },
  { code: "VU", dial: "+678", name: "Vanuatu" },
  { code: "VA", dial: "+379", name: "Vatican City" },
  { code: "VE", dial: "+58", name: "Venezuela" },
  { code: "VN", dial: "+84", name: "Vietnam" },
  { code: "YE", dial: "+967", name: "Yemen" },
  { code: "ZM", dial: "+260", name: "Zambia" },
  { code: "ZW", dial: "+263", name: "Zimbabwe" },
];

export const KENYA_DEFAULT = WORLD_COUNTRIES.find((c) => c.code === "KE") || {
  code: "KE",
  dial: "+254",
  name: "Kenya",
};

export const getFlagUrl = (code) =>
  `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code.toUpperCase()}.svg`;

export default function CountryPhoneInput({
  phone = "",
  countryCode = "KE",
  onChangePhone,
  onChangeCountry,
  required = false,
  placeholder = "0712 345678",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Selected country object, defaults strictly to Kenya
  const selectedCountry = useMemo(() => {
    return (
      WORLD_COUNTRIES.find(
        (c) => c.code.toUpperCase() === (countryCode || "KE").toUpperCase()
      ) || KENYA_DEFAULT
    );
  }, [countryCode]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      // Focus search input on open
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Filter countries alphabetically by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.replace("+", "").includes(q.replace("+", "")) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectCountry = (country) => {
    if (onChangeCountry) {
      onChangeCountry(country.code);
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-13 w-full rounded-2xl border border-slate-300/70 bg-white text-base text-slate-950 flex items-center transition focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 relative">
      {/* Country selector button */}
      <div ref={dropdownRef} className="relative shrink-0 border-r border-slate-200">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 h-13 cursor-pointer hover:bg-slate-50 transition-colors rounded-l-2xl select-none"
          title={`${selectedCountry.name} (${selectedCountry.dial})`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <img
            src={getFlagUrl(selectedCountry.code)}
            alt={selectedCountry.name}
            className="w-6 h-4 object-cover rounded-sm shadow-sm shrink-0"
            loading="lazy"
          />
          <span className="text-sm font-semibold text-slate-700">
            {selectedCountry.dial}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-80 max-h-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search header */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Countries scrollable list */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100/60">
              {/* Default pinned country (Kenya) when no search query is active */}
              {!searchQuery && (
                <div className="bg-blue-50/40 p-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Default Country
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCountry(KENYA_DEFAULT)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      selectedCountry.code === "KE"
                        ? "bg-blue-100/70 font-semibold text-blue-900"
                        : "hover:bg-blue-100/40 text-slate-800"
                    }`}
                  >
                    <img
                      src={getFlagUrl(KENYA_DEFAULT.code)}
                      alt={KENYA_DEFAULT.name}
                      className="w-6 h-4 object-cover rounded-sm shadow-sm shrink-0"
                    />
                    <span className="text-sm font-medium flex-1">
                      {KENYA_DEFAULT.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-blue-700">
                      {KENYA_DEFAULT.dial}
                    </span>
                    {selectedCountry.code === "KE" && (
                      <Check className="w-4 h-4 text-blue-600 ml-1" />
                    )}
                  </button>
                  <div className="mt-1 border-b border-slate-200/60" />
                </div>
              )}

              {/* Alphabetical list of countries */}
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/80 font-semibold text-blue-950" : "text-slate-800"
                      }`}
                    >
                      <img
                        src={getFlagUrl(c.code)}
                        alt={c.name}
                        className="w-6 h-4 object-cover rounded-sm shadow-sm shrink-0"
                        loading="lazy"
                      />
                      <span className="text-sm flex-1 truncate">{c.name}</span>
                      <span className="text-xs font-mono text-slate-500 font-medium">
                        {c.dial}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No countries found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actual phone number input */}
      <input
        type="tel"
        required={required}
        placeholder={placeholder}
        value={phone}
        onChange={(e) => onChangePhone && onChangePhone(e.target.value)}
        className="flex-1 min-w-0 px-3.5 border-0 bg-transparent text-inherit outline-none placeholder:text-slate-400 text-sm sm:text-base font-medium"
      />
    </div>
  );
}
