import { fireEvent } from "@testing-library/react";

type UserEventInstance = {
  click: (element: Element) => Promise<void>;
  type: (element: Element, text: string) => Promise<void>;
  clear: (element: Element) => Promise<void>;
  upload: (element: Element, files: File | File[]) => Promise<void>;
  keyboard: (text: string) => Promise<void>;
};

const userEvent = {
  setup: (): UserEventInstance => ({
    click: async (element) => {
      fireEvent.pointerDown(element);
      fireEvent.mouseDown(element);
      fireEvent.mouseUp(element);
      fireEvent.click(element);
    },
    type: async (element, text) => {
      fireEvent.change(element, { target: { value: text } });
    },
    clear: async (element) => {
      fireEvent.change(element, { target: { value: "" } });
    },
    upload: async (element, files) => {
      const fileList = Array.isArray(files) ? files : [files];
      fireEvent.change(element, { target: { files: fileList } });
    },
    keyboard: async (text) => {
      for (const key of text) {
        fireEvent.keyDown(document.body, { key });
        fireEvent.keyUp(document.body, { key });
      }
    },
  }),
};

export default userEvent;
