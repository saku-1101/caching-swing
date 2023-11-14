'use server'

import { revalidatePath, revalidateTag } from "next/cache";

export default async function handleUpdateUserName(data: FormData) {
    await fetch(`${process.env.BASE_URL}/api/update/user`, {
        method: "POST",
        body: JSON.stringify({
            name: data.get("name"),
        }),
    });
    revalidateTag("user");
}