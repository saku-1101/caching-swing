import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      style={{
        padding: "1%",
        margin: "1%",
        backgroundColor: "gray",
        borderRadius: "5px",
        border: "1px solid black",
        cursor: "pointer",
      }}
      type="button"
      onClick={() => router.back()}
    >
      Back
    </button>
  );
}
