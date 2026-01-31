import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  value: () => {},
});

class FileReaderMock {
  onload: ((event: { target: { result: string } }) => void) | null = null;
  onerror: ((event: { target: { error: Error } }) => void) | null = null;

  readAsText(file: File) {
    const readPromise =
      typeof file.text === "function"
        ? file.text()
        : Promise.resolve("");

    readPromise
      .then((text) => {
        this.onload?.({ target: { result: text } });
      })
      .catch((error: Error) => {
        this.onerror?.({ target: { error } });
      });
  }
}

Object.defineProperty(window, "FileReader", {
  writable: true,
  value: FileReaderMock,
});

Object.defineProperty(window.HTMLAnchorElement.prototype, "click", {
  writable: true,
  value: () => {},
});
