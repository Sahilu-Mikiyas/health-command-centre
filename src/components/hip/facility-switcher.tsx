import { Building2, Ribbon, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { FACILITIES, setFacility, useFacility, type FacilityId } from "@/lib/hip/facility";

const ICONS: Record<FacilityId, typeof Building2> = {
  internal_medicine: Stethoscope,
  oncology: Ribbon,
};

/** Super Admin control: which facility this deployment is presenting as. */
export function FacilitySwitcher() {
  const active = useFacility();

  return (
    <div className="apple-card space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-black text-white shadow-md">
          <Building2 className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-black text-black">Facility profile</h3>
          <p className="text-xs font-semibold text-[#86868B]">
            One platform, configured per client — branding, letterheads and featured workspaces.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(FACILITIES) as FacilityId[]).map((id) => {
          const profile = FACILITIES[id];
          const Icon = ICONS[id];
          const selected = active.id === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFacility(id);
                toast.success(`Now presenting as ${profile.name}`);
              }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                selected
                  ? "border-black bg-white shadow-md"
                  : "border-black/10 bg-[#FAFAFC] hover:bg-white"
              }`}
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${selected ? "text-black" : "text-[#86868B]"}`} />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-black">{profile.name}</span>
                <span className="block text-[11px] font-semibold text-[#86868B]">{profile.tagline}</span>
                {selected && (
                  <span className="mt-2 inline-block rounded-full bg-[#E8F8EC] px-2.5 py-0.5 text-[10px] font-bold text-[#1D8A39]">
                    Active
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-semibold text-[#86868B]">
        Tip: share a link with <code className="rounded bg-[#F5F5F7] px-1.5 py-0.5">?facility=oncology</code> or{" "}
        <code className="rounded bg-[#F5F5F7] px-1.5 py-0.5">?facility=im</code> to open the platform in that profile.
      </p>
    </div>
  );
}
