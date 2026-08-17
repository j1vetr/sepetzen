import { useEffect, useRef } from 'react';
import { CITY_NAMES, getDistricts } from '@/data/turkey-locations';

interface CityDistrictSelectProps {
  city: string;
  district: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  selectClassName?: string;
  labelClassName?: string;
  required?: boolean;
  cityTestId?: string;
  districtTestId?: string;
}

export default function CityDistrictSelect({
  city,
  district,
  onCityChange,
  onDistrictChange,
  selectClassName = '',
  labelClassName = '',
  required = true,
  cityTestId,
  districtTestId,
}: CityDistrictSelectProps) {
  const districts = getDistricts(city);

  // Whether the current city/district values are legacy free-text (not in the known lists)
  const cityIsLegacy = city !== '' && !CITY_NAMES.includes(city);
  const districtIsLegacy = district !== '' && !districts.includes(district);

  // Track whether the city has changed by the user (not on initial mount)
  const prevCityRef = useRef<string | null>(null);

  useEffect(() => {
    // On first run, just record the initial city without resetting district
    if (prevCityRef.current === null) {
      prevCityRef.current = city;
      return;
    }

    // City changed by the user: reset district only if it's not valid for the new city
    if (city !== prevCityRef.current) {
      prevCityRef.current = city;
      if (city && district && !getDistricts(city).includes(district)) {
        onDistrictChange('');
      }
    }
  }, [city]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div>
        <label className={labelClassName}>İl {required && <span className="text-red-500">*</span>}</label>
        <select
          value={city}
          onChange={(e) => { onCityChange(e.target.value); onDistrictChange(''); }}
          className={selectClassName}
          data-testid={cityTestId}
          required={required}
        >
          <option value="">İl seçin</option>
          {/* Legacy free-text city not in the known list — show it so the field isn't blank */}
          {cityIsLegacy && (
            <option key="__legacy_city__" value={city}>{city}</option>
          )}
          {CITY_NAMES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName}>İlçe {required && <span className="text-red-500">*</span>}</label>
        <select
          value={district}
          onChange={(e) => onDistrictChange(e.target.value)}
          className={selectClassName}
          data-testid={districtTestId}
          required={required}
          disabled={!city}
        >
          <option value="">{city ? 'İlçe seçin' : 'Önce il seçin'}</option>
          {/* Legacy free-text district not in the known list — show it so the field isn't blank */}
          {districtIsLegacy && (
            <option key="__legacy_district__" value={district}>{district}</option>
          )}
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </>
  );
}
