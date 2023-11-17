import { FormEvent } from "react";
import { useGetUser } from "../hooks/useGetUser";
import { useMutateUser } from "../hooks/useMutateUser";

export const Person = () => {
  const { user, userError, userIsFetching } = useGetUser();
  const { mutate, userMutationError, userMutationIsValidating } =
    useMutateUser();
  async function handleUpdateUserName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = JSON.stringify({
      name: data.get("name"),
    });
    mutate(body);
  }

  if (userIsFetching) {
    return <div>⏳loading...</div>;
  } else if (userMutationIsValidating) {
    return <div>Updating...</div>;
  } else if (userError || userMutationError) {
    return <div>failed</div>;
  }

  return (
    <>
      <div>Hello {user.name}!</div>
      <form onSubmit={handleUpdateUserName}>
        <label htmlFor="name">Enter your new name:</label>
        <br />
        <input
          type="text"
          name="name"
          style={{ padding: "2px", margin: "2px" }}
        />
        <button type="submit" style={{ padding: "2px", margin: "2px" }}>
          Update Name
        </button>
      </form>
    </>
  );
};
