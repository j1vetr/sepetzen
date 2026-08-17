import { useEffect } from 'react';
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

  // Reset district when city changes and current district not in new list
  useEffect(() => {
    if (city && district && !districts.includes(district)) {
      onDistrictChange('');
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
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </>
  );
}
