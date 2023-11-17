import { FormEvent } from "react";
import { mutate } from "swr";
import { useGetUser } from "../hooks/useGetUser";

export const Person = () => {
  const { user, userError, userIsLoading, userIsValidating } = useGetUser();

  async function handleUpdateUserName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    await fetch("/api/update/user", {
      method: "POST",
      body: JSON.stringify({
        name: data.get("name"),
      }),
    });
    mutate("/api/get/user");
  }

  if (userIsLoading) {
    return <div>⏳Initial loading...</div>;
  } else if (userIsValidating) {
    return <div>⏳loading...</div>;
  } else if (userError) {
    return <div>failed to load</div>;
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
