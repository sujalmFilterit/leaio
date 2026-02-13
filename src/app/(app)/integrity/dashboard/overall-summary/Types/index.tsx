
export interface PublisherApiResponse {
  [key: string]: string[];
  Affiliate: string[];
  "Whitelisted Publisher": string[];
}

export interface FilterApiResponse {
  data: string[];
  isLoading: boolean;
}