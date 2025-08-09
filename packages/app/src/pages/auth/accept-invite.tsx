import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";

const prisma = new PrismaClient();

interface Invitation {
  id: string;
  email: string;
  houseId: string;
  house: {
    name: string;
  };
  accepted: boolean;
  expiresAt: Date;
}

interface AcceptInviteProps {
  invitation: Invitation | null;
}

export default function AcceptInvite({ invitation }: AcceptInviteProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleAcceptInvite = useCallback(async () => {
    if (!invitation) return;
    
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId: invitation.id }),
      });

      if (res.ok) {
        setMessage(`You have been added to ${invitation.house.name}. Redirecting to house dashboard...`);
        setTimeout(() => {
          router.push(`/house/${invitation.houseId}`);
        }, 2000);
      } else {
        const data = await res.json();
        setMessage(data.message || "An error occurred while accepting the invitation");
      }
    } catch (error) {
      setMessage("An error occurred while accepting the invitation");
    }
  }, [invitation, router]);

  useEffect(() => {
    if (invitation) {
      handleAcceptInvite();
    }
  }, [invitation, handleAcceptInvite]);

  if (!invitation) {
    return (
      <div>
        <h1>Invalid Invitation</h1>
        <p>This invitation is invalid or has expired.</p>
        <Link href="/">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Accept Invitation</h1>
      <p>You have been invited to join {invitation.house.name}</p>
      <p>{message || "Accepting invitation..."}</p>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  const { id } = context.query;

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  if (!id) {
    return {
      props: { invitation: null },
    };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: String(id) },
    include: { house: true },
  });

  if (!invitation || !session.user || invitation.email !== session.user.email || invitation.accepted) {
    return {
      props: { invitation: null },
    };
  }

  const now = new Date();
  if (invitation.expiresAt < now) {
    return {
      props: { invitation: null },
    };
  }

  return {
    props: { invitation },
  };
}