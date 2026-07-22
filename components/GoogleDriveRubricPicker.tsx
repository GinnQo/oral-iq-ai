"use client";

import Script from "next/script";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

export type SelectedRubric = {
  id: string;
  name: string;
  mimeType?: string;
};

type GoogleDriveRubricPickerProps = {
  disabled?: boolean;
  onRubricSelected: (
    rubric: SelectedRubric
  ) => Promise<void> | void;
  onError: (message: string) => void;
};

type PickerDocument = {
  id?: string;
  name?: string;
  mimeType?: string;
};

type PickerResponse = {
  action?: string;
  docs?: PickerDocument[];
};

type AuthenticatedSession = {
  accessToken?: string;
  authError?: string;
};

declare global {
  interface Window {
    gapi?: {
      load: (
        libraryName: string,
        callback: () => void
      ) => void;
    };

    google?: {
      picker: {
        Action: {
          PICKED: string;
          CANCEL: string;
        };

        ViewId: {
          DOCS: string;
        };

        DocsView: new (
          viewId: string
        ) => {
          setIncludeFolders: (
            value: boolean
          ) => unknown;
          setSelectFolderEnabled: (
            value: boolean
          ) => unknown;
        };

        PickerBuilder: new () => {
          setAppId: (
            appId: string
          ) => unknown;
          setOAuthToken: (
            token: string
          ) => unknown;
          setDeveloperKey: (
            key: string
          ) => unknown;
          addView: (
            view: unknown
          ) => unknown;
          setTitle: (
            title: string
          ) => unknown;
          setCallback: (
            callback: (
              data: PickerResponse
            ) => void
          ) => unknown;
          build: () => {
            setVisible: (
              visible: boolean
            ) => void;
          };
        };
      };
    };
  }
}

export default function GoogleDriveRubricPicker({
  disabled = false,
  onRubricSelected,
  onError,
}: GoogleDriveRubricPickerProps) {
  const { data: session } = useSession();

  const [pickerReady, setPickerReady] =
    useState(false);

  const [opening, setOpening] =
    useState(false);

  const loadPickerLibrary =
    useCallback(() => {
      if (!window.gapi) {
        setPickerReady(false);

        onError(
          "Google Drive Picker could not load."
        );

        return;
      }

      window.gapi.load("picker", () => {
        if (window.google?.picker) {
          setPickerReady(true);
          return;
        }

        setPickerReady(false);

        onError(
          "Google Drive Picker did not initialize correctly."
        );
      });
    }, [onError]);

  const openPicker =
    useCallback(() => {
      const currentSession =
        session as AuthenticatedSession | null;

      const accessToken =
        currentSession?.accessToken;

      const developerKey =
        process.env
          .NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;

      const appId =
        process.env
          .NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;

      if (disabled || opening) {
        return;
      }

      if (currentSession?.authError) {
        onError(
          "Your Google authorization has expired. Please sign out and sign in with Google again."
        );

        return;
      }

      if (!accessToken) {
        onError(
          "Please sign out and sign in with Google again before selecting a rubric."
        );

        return;
      }

      if (!developerKey) {
        onError(
          "NEXT_PUBLIC_GOOGLE_PICKER_API_KEY is missing from .env.local."
        );

        return;
      }

      if (!appId) {
        onError(
          "NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER is missing from .env.local."
        );

        return;
      }

      if (
        !pickerReady ||
        !window.google?.picker
      ) {
        onError(
          "Google Drive is still loading. Please try again."
        );

        return;
      }

      try {
        setOpening(true);

        const googlePicker =
          window.google.picker;

        const documentsView =
          new googlePicker.DocsView(
            googlePicker.ViewId.DOCS
          );

        documentsView.setIncludeFolders(
          true
        );

        documentsView.setSelectFolderEnabled(
          false
        );

        const pickerBuilder =
          new googlePicker.PickerBuilder();

        pickerBuilder.setAppId(appId);

        pickerBuilder.setOAuthToken(
          accessToken
        );

        pickerBuilder.setDeveloperKey(
          developerKey
        );

        pickerBuilder.addView(
          documentsView
        );

        pickerBuilder.setTitle(
          "Select a rubric from Google Drive"
        );

        pickerBuilder.setCallback(
          (data: PickerResponse) => {
            const action = data.action;

            if (
              action ===
              googlePicker.Action.PICKED
            ) {
              const selectedDocument =
                data.docs?.[0];

              if (
                !selectedDocument?.id
              ) {
                setOpening(false);

                onError(
                  "Google Drive did not return a valid file."
                );

                return;
              }

              const selectedRubric: SelectedRubric =
                {
                  id: selectedDocument.id,
                  name:
                    selectedDocument.name ??
                    "Google Drive Rubric",
                  mimeType:
                    selectedDocument.mimeType,
                };

              Promise.resolve(
                onRubricSelected(
                  selectedRubric
                )
              )
                .catch((error: unknown) => {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "The selected rubric could not be loaded.";

                  onError(message);
                })
                .finally(() => {
                  setOpening(false);
                });

              return;
            }

            if (
              action ===
              googlePicker.Action.CANCEL
            ) {
              setOpening(false);
            }
          }
        );

        const picker =
          pickerBuilder.build();

        picker.setVisible(true);
      } catch (error: unknown) {
        setOpening(false);

        const message =
          error instanceof Error
            ? error.message
            : "Google Drive Picker could not be opened.";

        onError(message);
      }
    }, [
      disabled,
      onError,
      onRubricSelected,
      opening,
      pickerReady,
      session,
    ]);

  return (
    <>
      <Script
        id="google-picker-api-script"
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={loadPickerLibrary}
        onError={() => {
          setPickerReady(false);
          setOpening(false);

          onError(
            "The Google Drive Picker script failed to load."
          );
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={
          disabled ||
          opening ||
          !pickerReady
        }
        className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {opening
          ? "Opening Google Drive..."
          : pickerReady
            ? "Choose Rubric from Google Drive"
            : "Loading Google Drive..."}
      </button>
    </>
  );
}