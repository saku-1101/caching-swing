import useSWR from "swr";
import { fetcher } from "./fetcher";

export const useGetUser = () => {
  const url = "/api/get/user";
  // const { data, error, isLoading, isValidating } = useSWR(url, fetcher);
  const { data, error, isLoading, isValidating } = useSWR(url, fetcher, {
    refreshInterval: 5000,
  });
  return {
    user: data,
    userError: error,
    userIsLoading: isLoading,
    userIsValidating: isValidating,
  };
};
