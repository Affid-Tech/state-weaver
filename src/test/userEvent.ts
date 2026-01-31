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
      if (element instanceof HTMLElement) {
        element.focus();
      }
      fireEvent.pointerDown(element, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
      });
      fireEvent.mouseDown(element, { button: 0, buttons: 1 });
      fireEvent.pointerUp(element, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
      });
      fireEvent.mouseUp(element, { button: 0, buttons: 0 });
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
