declare module 'react-select-country-list' {
  export default function countryList(): {
    getData(): Array<{ value: string; label: string }>;
  };
}
