import { Spin } from "antd"

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#131314",
      }}
    >
      <Spin size="large" />
    </div>
  )
}
