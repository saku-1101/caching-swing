import { useGetNumber } from "../hooks/useGetNumber";
import { useGetUser } from "../hooks/useGetUser";
import { useGithub } from "../hooks/useGithub";

export default function Header() {
  const {
    data: githubData,
    error: githubError,
    isLoading: githubIsLoading,
    isValidating: githubIsValidating,
  } = useGithub();
  const {
    data: numberData,
    error: numberError,
    isLoading: numberIsLoading,
    isValidating: numberIsValidating,
  } = useGetNumber();
  const { user, userError, userIsLoading, userIsValidating } = useGetUser();

  if (githubIsLoading || numberIsLoading || userIsLoading) {
    return <div>⏳Initial loading...</div>;
  } else if (githubIsValidating || numberIsValidating || userIsValidating) {
    return <div>⏳loading...</div>;
  } else if (githubError || numberError || userError) {
    return <div>failed to load</div>;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "2%",
        border: "1px solid #ccc",
      }}
    >
      <h1 className="text-3xl font-extrabold">{githubData.name}</h1>
      <p>{githubData.description}</p>
      <strong>🔢Random Number: {numberData.randomNumber}</strong>
      <strong>🌟User: {user.name}</strong>
    </div>
  );
}
