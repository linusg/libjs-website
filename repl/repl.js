if (typeof Module === "undefined")
  throw new Error("LibJS.js must be loaded before repl.js");

function globalDisplayToUser(text) {
  globalDisplayToUser.repl.push(text);
}

async function createREPL(elements) {
  const repl = Object.create(null);
  elements.updateLoading("LibJS Runtime", { known: false });

  await new Promise((resolve) => addOnPostRun(resolve));

  elements.updateLoading("LibJS WebAssembly Module", { known: false });
  if (!runtimeInitialized) {
    initRuntime();
  }

  if (Module._initialize_repl() !== 0)
    throw new Error("Failed to initialize REPL");

  repl.private = {
    allowingDirectInput: false,
    activeInputs: [],
    inactiveInputs: [],
    outputs: [],
    prepareInput() {
      let node = elements.inputTemplate.content.children[0].cloneNode(true);
      return repl.private.attachInput(node, { directly: true });
    },
    prepareOutput() {
      let node = elements.outputTemplate.cloneNode(true).content.children[0];
      node = elements.outputElement.appendChild(node);
      node.addEventListener("mouseenter", () => {
        if (!node._input) return;

        node._input.classList.add("hovered-related");
        node._input._related.forEach((other) => {
          other.classList.add("hovered-related");
        });
      });
      node.addEventListener("mouseleave", () => {
        if (!node._input) return;

        node._input.classList.remove("hovered-related");
        node._input._related.forEach((other) => {
          other.classList.remove("hovered-related");
        });
      });
      return node;
    },
    attachInput(node, { directly }) {
      if (directly) {
        node = elements.outputElement.appendChild(node);
        node._isDirect = true;
      }
      node._related = [];
      const editor = node.querySelector("textarea");
      editor.addEventListener("keydown", (event) => {
        const requireCtrl = directly;
        if (event.keyCode == 13 && requireCtrl ^ event.ctrlKey) {
          event.preventDefault();
          repl.execute(node, editor.value);
          return false;
        }
        return true;
      });
      node.addEventListener("mouseenter", () => {
        node._related.forEach((other) => {
          other.classList.add("hovered-related");
        });
      });
      node.addEventListener("mouseleave", () => {
        node._related.forEach((other) => {
          other.classList.remove("hovered-related");
        });
      });
      return node;
    },
    execute(text) {
      const encodedText = Module.allocateUTF8(text);
      let oldRepl = globalDisplayToUser.repl;
      try {
        globalDisplayToUser.repl = repl.private.outputs;
        Module._execute(encodedText, text.length);
        return repl.private.outputs;
      } finally {
        globalDisplayToUser.repl = oldRepl;
        repl.private.outputs = [];
        Module._free(encodedText);
      }
    },
    markRelated(node, input) {
      node._input = input;
      input._related.push(node);
    },
  };

  repl.private.attachInput(elements.inputElement, { directly: false });

  repl.display = (text, relatedInput = null) => {
    text.split("\n").forEach((line) => {
      const node = repl.private.prepareOutput();
      node.querySelector("pre").textContent = line;
      if (relatedInput !== null) {
        repl.private.markRelated(node, relatedInput);
      }
    });
  };
  repl.allowDirectInput = () => {
    repl.private.allowingDirectInput = true;
    repl.private.inactiveInputs.forEach((node) =>
      repl.private.attachInput(node, { directly: true })
    );
    repl.private.activeInputs = repl.private.inactiveInputs;
    repl.private.inactiveInputs = [];
    if (
      repl.private.allowingDirectInput &&
      repl.private.activeInputs.length == 0
    ) {
      repl.addInput();
    }
  };
  repl.prohibitDirectInput = () => {
    repl.private.allowingDirectInput = false;
    repl.private.activeInputs.forEach((node) => node.remove());
    repl.private.inactiveInputs = repl.private.inactiveInputs.concat(
      repl.private.activeInputs
    );
    repl.private.activeInputs = [];
  };
  repl.addInput = () => {
    const input = repl.private.prepareInput();
    repl.private.activeInputs.push(input);
    input.querySelector("textarea").focus();
  };
  repl.addStaticInput = (text) => {
    const input =
      elements.staticInputTemplate.cloneNode(true).content.children[0];
    input.querySelector("pre.content").textContent = text;
    input._related = [];
    return elements.outputElement.appendChild(input);
  };
  repl.execute = (input, text) => {
    repl.private.activeInputs = repl.private.activeInputs.filter(
      (i) => i !== input
    );
    let staticInput = repl.addStaticInput(text);
    let outputs = repl.private.execute(text).join("");
    if (outputs.endsWith("undefined\n"))
      outputs = outputs.substring(0, outputs.length - 10);

    repl.display(outputs, input);

    input._related.forEach((node) =>
      repl.private.markRelated(node, staticInput)
    );
    if (input._isDirect) {
      input.remove();
    }

    if (
      repl.private.allowingDirectInput &&
      repl.private.activeInputs.length == 0
    ) {
      repl.addInput();
    }
  };

  return repl;
}
