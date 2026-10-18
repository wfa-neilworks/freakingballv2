import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClubSidebar } from "@/components/layout/club-sidebar";

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.role !== "club_admin") redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, status")
    .eq("admin_id", user.id)
    .single();

  if (!club) redirect("/login");
  if (club.status === "pending") redirect("/pending");
  if (club.status === "rejected") redirect("/rejected");

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0d1810" }}>
      <ClubSidebar
        user={{ name: profile.full_name, email: profile.email }}
        clubName={club.name}
      />
      <main
        className="flex-1 overflow-auto p-4 pt-[72px] lg:p-8 lg:pt-8"
        style={{ backgroundColor: "#18251D" }}
      >
        {children}
      </main>
    </div>
  );
}
