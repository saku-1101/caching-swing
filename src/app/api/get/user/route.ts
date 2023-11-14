import { assertNonNullable } from "@/libs/assert";
import { User } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET( req: NextRequest,
  res: NextResponse<User>) {
    try{
      const tag = req.nextUrl.searchParams.get('tag')
      const user = await prisma.user.findUnique({
        where: { id: 1 },
      });
      assertNonNullable(user);
      tag && revalidateTag(tag);
    return NextResponse.json({...user}, {status: 200})
    }catch{
      return NextResponse.json({message: "error"}, {status: 500})
    }
}