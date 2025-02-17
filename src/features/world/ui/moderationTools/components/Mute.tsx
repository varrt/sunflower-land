import React, { useState } from "react";
import { Button } from "components/ui/Button";
import { Player } from "../ModerationTools";

import { mutePlayer } from "features/world/lib/moderationAction";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

interface Props {
  player?: Player;
  authState: any;
  moderatorFarmId: number;
  scene: any;
  onClose: () => void;
}

export type MuteDuration = 1 | 5 | 10 | 60 | 720 | 1440 | 10080;

export const MUTE_DURATIONS: { value: MuteDuration; label: string }[] = [
  { value: 5, label: "5 mins" },
  { value: 10, label: "10 mins" },
  { value: 60, label: "1 hour" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
  { value: 10080, label: "1 week" },
];

export const MuteModal: React.FC<Props> = ({
  player,
  authState,
  moderatorFarmId,
  scene,
  onClose,
}) => {
  const { t } = useAppTranslation();

  const [muteStatus, setMuteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [farmId, setFarmId] = useState<number | undefined>(
    player?.farmId || undefined
  );
  const [duration, setDuration] = useState<MuteDuration>(5);
  const [reason, setReason] = useState("");

  const handleMuteAction = async () => {
    if (!authState || !farmId) return;
    setMuteStatus("loading");

    const until = new Date().getTime() + duration * 60 * 1000;

    await mutePlayer({
      token: authState.rawToken as string,
      farmId: moderatorFarmId,
      mutedId: farmId,
      reason: reason,
      mutedUntil: until,
    })
      .then((r) => {
        r.success ? setMuteStatus("success") : setMuteStatus("error");

        scene.mmoService.state.context.server?.send("moderation_event", {
          type: "mute",
          farmId: farmId as number,
          reason: reason,
          mutedUntil: until,
        });
      })
      .catch((e) => setMuteStatus("error"));
  };

  const handleClose = () => {
    setFarmId(undefined);
    setDuration(5);
    setReason("");
    onClose();
  };

  return (
    <>
      {muteStatus === "idle" && (
        <div className="flex flex-col w-full p-1">
          <span className="text-lg text-center">{t("mute.playe")}</span>
          <span className="text-xxs text-left mt-2 mb-1">
            {t("player.farm.iD")}
          </span>
          <input
            className="w-full text-shadow rounded-sm shadow-inner shadow-black bg-brown-200"
            value={farmId}
            onChange={(e) => setFarmId(Number(e.target.value))}
          />
          <span className="text-xxs text-left mt-2 mb-1">
            {t("mute.duration")}
          </span>
          <select
            className="w-full text-shadow rounded-sm shadow-inner shadow-black bg-brown-200"
            onChange={(e) =>
              setDuration(Number(e.target.value) as MuteDuration)
            }
            value={duration}
          >
            {MUTE_DURATIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xxs text-left mt-2 mb-1">
            {t("mute.Reason")}
          </span>
          <textarea
            className="w-full h-20 text-shadow rounded-sm shadow-inner shadow-black bg-brown-200"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2 w-full mt-2">
            <Button onClick={handleClose}>{t("cancel")}</Button>
            <Button
              onClick={handleMuteAction}
              disabled={reason.length === 0 || !farmId}
            >
              {t("confirm")}
            </Button>
          </div>
        </div>
      )}

      {muteStatus === "success" && (
        <div className="flex flex-col items-center w-full px-1">
          <span className="text-sm text-center">
            {t("mute.player.farm")} {farmId}
          </span>
          <span className="text-xs text-center">{t("mute.player.mute")}</span>
          <div className="flex gap-2 w-full mt-2">
            <Button onClick={handleClose}>{t("close")}</Button>
          </div>
        </div>
      )}
      {muteStatus === "error" && (
        <div className="flex flex-col items-center w-full px-1">
          <span className="text-sm text-center">
            {t("mute.player.farm")}
            {farmId}
          </span>
          <span className="text-xs text-center">{t("mute.fail")}</span>
          <div className="flex gap-2 w-full mt-2">
            <Button onClick={handleClose}>{t("close")}</Button>
          </div>
        </div>
      )}
      {muteStatus === "loading" && (
        <div className="flex flex-col items-center w-full px-1">
          <span className="text-lg text-center">{t("mute.player.muting")}</span>
          <span className="text-xs text-center mt-2">{t("please.wait")}</span>
        </div>
      )}
    </>
  );
};
