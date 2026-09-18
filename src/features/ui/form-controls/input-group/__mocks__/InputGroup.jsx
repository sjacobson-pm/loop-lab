export const InputGroup = ({ prependAddOns, appendAddOns, children }) => (
  <div data-append-add-ons={JSON.stringify(appendAddOns)}>
    InputGroup
    <div>
      PrependAddOns
      {prependAddOns
        ? prependAddOns.map((addOn, index) => (
            <div id={`prepend-addon-${index}`} key={index}>
              {JSON.stringify(addOn)}
              {addOn.onClick ? (
                <button type="button" onClick={addOn.onClick}>
                  prepend-add-on--on-click-trigger-{index}
                </button>
              ) : null}
            </div>
          ))
        : null}
    </div>
    <div>
      AppendAddOns
      {appendAddOns
        ? appendAddOns.map((addOn, index) => (
            <div id={`append-addon-${index}`} key={index}>
              {JSON.stringify(addOn)}
              {addOn.onClick ? (
                <button type="button" onClick={addOn.onClick}>
                  append-add-on--on-click-trigger-{index}
                </button>
              ) : null}
            </div>
          ))
        : null}
    </div>
    {children}
  </div>
);
