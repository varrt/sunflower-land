import React, { useState } from "react";
import { Player } from "../ModerationTools";
import { Button } from "components/ui/Button";

import { KickModal } from "../components/Kick";
import { MuteModal } from "../components/Mute";
import { UnMuteModal } from "../components/Unmute";

import HaloIcon from "assets/sfts/halo.png";
import { calculateMuteTime } from "../components/Muted";

import { mutePlayer } from "features/world/lib/moderationAction";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

type Props = {
  scene?: any;
  authState: any;
  moderatorFarmId: number;
  players: Player[];
};

export const PlayerList: React.FC<Props> = ({
  scene,
  players,
  authState,
  moderatorFarmId,
}) => {
  const [step, setStep] = useState<"MAIN" | "MUTE" | "KICK" | "UNMUTE">("MAIN");

  const [unMuteStatus, setUnMuteStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>();
  const [search, setSearch] = useState("");

  const isModerator = (player: Player) => {
    if (player.clothing.hat === "Halo") {
      return true;
    } else {
      return false;
    }
  };

  const Players = players.filter((player) => {
    if (!player.username) player.username = "";

    if (search.length === 0) {
      return true;
    } else {
      return (
        player.farmId.toString().includes(search.toLowerCase()) ||
        player?.username.toLowerCase().includes(search.toLowerCase())
      );
    }
  });
  const { t } = useAppTranslation();
  const unMutePlayer = async (player: Player) => {
    setStep("UNMUTE");
    await mutePlayer({
      token: authState.rawToken as string,
      farmId: moderatorFarmId,
      mutedId: player.farmId,
      mutedUntil: new Date().getTime() + 1000,
      reason: "UNMUTE",
    }).then((r) => {
      if (r.success) {
        setSelectedPlayer(player);
        setUnMuteStatus("success");
      } else {
        setUnMuteStatus("error");
        // eslint-disable-next-line no-console
        console.log(r);
      }
    });
  };

  return (
    <>
      {step === "MAIN" && (
        <>
          <div className="flex items-start gap-2 ml-1 mt-2 h-96 overflow-y-scroll scrollable">
            <table className="w-full text-xs table-fixed">
              <thead className="text-sm">
                <tr>
                  <th className="w-1/4">{t("player.list.playerID")}</th>
                  <th className="w-1/4">{t("player.list.farmID")}</th>
                  <th className="w-1/4">{t("player.list.username")}</th>
                  <th className="w-1/4">{t("player.list.status")}</th>
                  <th className="w-1/2">{t("player.list.playersConnected")}</th>
                </tr>
              </thead>
              <tbody>
                {Players.map((player) => {
                  const latestMute = player.moderation?.muted.sort(
                    (a, b) => a.mutedUntil - b.mutedUntil
                  )[0];

                  const isMuted =
                    latestMute && latestMute.mutedUntil > Date.now();

                  return (
                    <tr key={player.playerId}>
                      <td className="w-1/4">
                        <div className="flex items-center gap-1">
                          <span>{player.playerId}</span>
                          {isModerator(player) && (
                            <img src={HaloIcon} className="h-4" />
                          )}
                        </div>
                      </td>
                      <td className="w-1/4">{player.farmId}</td>
                      <td className="w-1/4">{player.username}</td>
                      <td className="w-1/4">
                        {!isMuted ? (
                          <span>{t("ok")}</span>
                        ) : (
                          <span
                            title={`Reason: ${latestMute.reason} - By: ${latestMute.mutedBy}`}
                          >
                            {t("player.list.mutedFor")}{" "}
                            {calculateMuteTime(
                              latestMute.mutedUntil,
                              "remaining"
                            )}
                          </span>
                        )}
                      </td>
                      {/* TODO: Once Mute is out, display if a player in the is muted and their time left */}
                      <td className="w-1/2">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              scene.teleportModerator(player.x, player.y);
                            }}
                          >
                            {"TP"}
                          </Button>
                          <Button
                            disabled={isModerator(player)}
                            onClick={() => {
                              setStep("KICK");
                              setSelectedPlayer(player);
                            }}
                          >
                            {t("kick")}
                          </Button>
                          <Button
                            disabled={isModerator(player)}
                            onClick={() => {
                              if (isMuted) {
                                unMutePlayer(player);
                              } else {
                                setStep("MUTE");
                                setSelectedPlayer(player);
                              }
                            }}
                          >
                            {isMuted ? "Unmute" : "Mute"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between m-1">
            <div className="flex items-center gap-1">
              <span className="text-xs">{t("player.list.search")}</span>
              <input
                className="w-1/2 text-xs text-shadow rounded-sm shadow-inner shadow-black bg-brown-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs">
              {players.length}
              {"/"}
              {t("player.list.playersConnected")}
            </span>
          </div>
        </>
      )}

      {step === "KICK" && (
        <KickModal
          onClose={() => setStep("MAIN")}
          player={selectedPlayer}
          authState={authState}
          moderatorFarmId={moderatorFarmId}
          scene={scene}
        />
      )}

      {step === "MUTE" && (
        <MuteModal
          onClose={() => setStep("MAIN")}
          player={selectedPlayer}
          authState={authState}
          moderatorFarmId={moderatorFarmId}
          scene={scene}
        />
      )}

      {step === "UNMUTE" && (
        <UnMuteModal
          onClose={() => {
            setStep("MAIN");
            setUnMuteStatus("loading");
          }}
          player={selectedPlayer}
          status={unMuteStatus}
        />
      )}
    </>
  );
};
