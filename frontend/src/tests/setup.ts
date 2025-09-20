// See https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#configuring-your-testing-environment
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

export {} 