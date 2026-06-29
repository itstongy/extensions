export type SketchyBarHiddenState = "on" | "off";
export type SketchyBarDrawingState = "on" | "off";

export type SketchyBarBar = {
  position?: string;
  topmost?: string;
  sticky?: string;
  hidden?: SketchyBarHiddenState;
  shadow?: string;
  show_in_fullscreen?: string;
  drawing?: SketchyBarDrawingState;
  height?: number;
  margin?: number;
  padding_left?: number;
  padding_right?: number;
  items?: string[];
};

export type SketchyBarItem = {
  name: string;
  type: string;
  geometry?: {
    drawing?: SketchyBarDrawingState;
    position?: string;
    width?: number;
    background?: {
      drawing?: SketchyBarDrawingState;
      color?: string;
      height?: number;
      corner_radius?: number;
    };
  };
  icon?: {
    value?: string;
    drawing?: SketchyBarDrawingState;
    color?: string;
  };
  label?: {
    value?: string;
    drawing?: SketchyBarDrawingState;
    color?: string;
  };
  scripting?: {
    script?: string;
    click_script?: string;
    update_freq?: number;
    updates?: string;
  };
  bounding_rects?: Record<string, unknown>;
};

export type SketchyBarEvent = {
  bit?: number;
  notification?: string;
};

export type SketchyBarEvents = Record<string, SketchyBarEvent>;

export type DiagnosticStatus = "success" | "warning" | "failure";

export type DiagnosticCheck = {
  title: string;
  status: DiagnosticStatus;
  message: string;
  detail?: string;
};
