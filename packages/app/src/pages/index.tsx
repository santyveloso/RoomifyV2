import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import "./styles/globals.css";

const prisma = new PrismaClient();

interface House {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface Invitation {
  id: string;
  house: House;
  invitedBy: User;
}

interface HomeProps {
  houses: House[];
  invitations: Invitation[];
}

export default function Home({ houses, invitations }: HomeProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div>
      <h1>Welcome, {session.user?.name || "User"}</h1>
      
      {invitations.length > 0 && (
        <div>
          <h2>Pending Invitations</h2>
          <ul>
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <strong>{invitation.house.name}</strong> - Invited by {invitation.invitedBy.name}
                <div>
                  <button onClick={() => handleAcceptInvitation(invitation.id)}>
                    Accept
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <h2>Your Houses</h2>
      {houses.length > 0 ? (
        <ul>
          {houses.map((house) => (
            <li key={house.id}>
              <Link href={`/house/${house.id}`}>{house.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>You are not a member of any houses yet.</p>
      )}
      <Link href="/house/create">Create a new house</Link>
    </div>
  );

  async function handleAcceptInvitation(invitationId: string) {
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      if (res.ok) {
        router.reload();
      } else {
        const data = await res.json();
        alert(data.message || "An error occurred while accepting the invitation");
      }
    } catch (error) {
      alert("An error occurred while accepting the invitation");
    }
  }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  
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
  const userEmail = session.user.email;
  
  if (!userId || !userEmail) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  // Get houses where the user is a member
  const houses = await prisma.house.findMany({
    where: {
      memberships: {
        some: {
          userId: userId,
        },
      },
    },
  });

  // Get pending invitations
  const now = new Date();
  const invitations = await prisma.invitation.findMany({
    where: {
      email: userEmail,
      accepted: false,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      house: true,
      invitedBy: true,
    },
  });

  return {
    props: { houses, invitations },
  };
}