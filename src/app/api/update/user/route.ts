import { User } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function POST( req: Request,
  res: NextResponse<User>) {
    try{
      const newName: string = (await req.json()).name;
      
      const updatedUser = await prisma.user.update({
        where: { id: 1 },
        data: { name: newName },
      });
      
    return NextResponse.json({updatedUser}, {status: 200})
    }catch{
      return NextResponse.json({message: "error"}, {status: 500})
    }
}