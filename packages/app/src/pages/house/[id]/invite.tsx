import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";

const prisma = new PrismaClient();

interface House {
  id: string;
  name: string;
  memberships: {
    userId: string;
  }[];
}

interface InviteMemberProps {
  house: House;
}

export default function InviteMember({ house }: InviteMemberProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { id } = router.query;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch(`/api/houses/${id}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setMessage("User invited successfully!");
      setEmail("");
    } else {
      const data = await res.json();
      setMessage(data.message || "An error occurred while inviting the user");
    }
  };

  return (
    <div>
      <h1>Invite Member to {house.name}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">Invite</button>
      </form>
      {message && <p>{message}</p>}
      <Link href={`/house/${id}`}>Back to House</Link>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  const { id } = context.params || {};

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  // Get the user ID from session
  const userId = (session.user as { id: string }).id;
  
  if (!userId) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const house = await prisma.house.findUnique({
    where: { id: String(id) },
    include: { memberships: true },
  });

  if (!house) {
    return {
      notFound: true,
    };
  }

  const isMember = house.memberships.some(
    (membership) => membership.userId === userId
  );

  if (!isMember) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: { house },
  };
}