import { useApiCall } from './api_base';

interface VtaEnablesPublishersPayload {
  package_name: string;
  start_date: string;
  end_date: string;
}

interface AttributionWindowPayload {
  package_name: string;
}

interface AttributionWindowResponse {
  "Click to Open Window (in Days)": number;
  "Inactivity Window": number;
  "VTA Enables Publishers": string[];
  "Frequency Cap": number;
  "Risk Tolerence": string;
}

interface PayoutDetailsPayload {
  package_name: string;
}

interface PayoutDetailsResponse {
  payout_details: {
    Impression: string[];
    Click: string[];
    Conversion: string[];
    Event: string[];
  };
}

interface CountryCodePayload {
  package_name: string;
}

interface SaveConfigPayload {
  package_name: string;
  update_data: {
    "Threshold Window": {
      "Click to Open Window (in Days)": number;
      "Inactivity Window": number;
      "Frequency Cap": number;
      "VTA Enables Publishers": string[];
      "Risk Tolerence": string;
    };
    "Payout Details": {
      Impression: string[];
      Click: string[];
      Conversion: string[];
      Event: string[];
    };
    "Geo Selection": string[];
  };
}

interface SaveConfigResponse {
  message: string;
}

export const useVtaEnablesPublishers = () => {
  return useApiCall<string[]>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/vta_enables_publishers`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('VTA Enables Publishers API Success:', data);
    },
    onError: (error) => {
      console.error('VTA Enables Publishers API Error:', error);
    },
  });
};

export const useGetAttributionWindow = () => {
  return useApiCall<AttributionWindowResponse>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/get_attribution_window`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('Attribution Window API Success:', data);
    },
    onError: (error) => {
      console.error('Attribution Window API Error:', error);
    },
  });
};

export const useGetPayoutDetails = () => {
  return useApiCall<PayoutDetailsResponse>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/get_payout_details`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('Payout Details API Success:', data);
    },
    onError: (error) => {
      console.error('Payout Details API Error:', error);
    },
  });
};

export const useGetCountryCodes = () => {
  return useApiCall<string[]>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/country_code`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('Country Codes API Success:', data);
    },
    onError: (error) => {
      console.error('Country Codes API Error:', error);
    },
  });
};

export const useGetConfiguredCountries = () => {
  return useApiCall<string[]>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/get_configured_country`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('Configured Countries API Success:', data);
    },
    onError: (error) => {
      console.error('Configured Countries API Error:', error);
    },
  });
};

export const useSaveConfiguration = () => {
  return useApiCall<SaveConfigResponse>({
    url: `${process.env.NEXT_PUBLIC_APP_PERF}reengagement/click/update_save_config`,
    method: 'POST',
    manual: true,
    onSuccess: (data) => {
      console.log('Save Configuration API Success:', data);
    },
    onError: (error) => {
      console.error('Save Configuration API Error:', error);
    },
  });
}; 