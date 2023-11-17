import { useGetNumber } from "../hooks/useGetNumber";
import { useGetUser } from "../hooks/useGetUser";
import { useGithub } from "../hooks/useGithub";

export default function Header() {
  const {
    data: githubData,
    error: githubError,
    isFetching: githubIsFetching,
    isPending: githubIsPending,
  } = useGithub();
  const {
    data: numberData,
    error: numberError,
    isFetching: numberIsFetching,
    isPending: numberIsPending,
  } = useGetNumber();
  const { user, userError, userIsFetching } = useGetUser();

  if (githubIsFetching || numberIsFetching || userIsFetching) {
    return <div>⏳loading...</div>;
  } else if (githubIsPending || numberIsPending) {
    return <div>validating...</div>;
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
