import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";

const prisma = new PrismaClient();

interface User {
  id: string;
  name: string;
  email: string;
}

interface Membership {
  id: string;
  userId: string;
  role: string;
  user: User;
}

interface House {
  id: string;
  name: string;
  memberships: Membership[];
  currentUser: {
    id: string;
  };
}

interface EditHouseProps {
  house: House;
}

export default function EditHouse({ house }: EditHouseProps) {
  const [name, setName] = useState(house.name);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { id } = router.query;

  // Check if current user is admin
  const currentUserMembership = house.memberships.find(
    (membership) => membership.userId === house.currentUser.id
  );
  const isAdmin = currentUserMembership?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You do not have permission to edit this house.</p>
        <Link href={`/house/${id}`}>Back to House</Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/houses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage("House updated successfully!");
        router.push(`/house/${id}`);
      } else {
        const data = await res.json();
        setMessage(data.message || "An error occurred while updating the house");
      }
    } catch (error) {
      setMessage("An error occurred while updating the house");
    }
  };

  return (
    <div>
      <h1>Edit House</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">House Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit">Update House</button>
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
    include: { 
      memberships: { 
        include: { user: true } 
      } 
    },
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
    props: { 
      house: {
        ...house,
        currentUser: { id: userId }
      }
    },
  };
}