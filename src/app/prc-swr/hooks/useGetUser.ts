import useSWR from "swr";
import { fetcher } from "./fetcher";

export const useGetUser = () => {
  const url = "/api/get/user";
  const { data, error, isLoading, isValidating } = useSWR(url, fetcher);
  // const { data, error, isLoading, isValidating } = useSWR(url, fetcher, { refreshInterval: 1000 });
  return {
    user: data,
    userError: error,
    userIsLoading: isLoading, // ロード済みのデータがまだない場合はtrue
    userIsValidating: isValidating, // バックグラウンドで再検証中の場合はtrue
  };
};
