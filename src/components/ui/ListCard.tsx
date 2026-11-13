import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import { Children, Fragment, type ReactNode } from "react";

export default function ListCard({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <Card>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}
