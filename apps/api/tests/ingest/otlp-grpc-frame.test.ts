import { describe, expect, test } from "vitest"
import { IngestError } from "@/features/ingest/providers/errors"
import {
  decodeFrames,
  encodeFrame,
} from "@/features/ingest/providers/otlp/grpc/frame"

describe("grpc frame", () => {
  test("round-trips an uncompressed payload", () => {
    const payload = new Uint8Array([1, 2, 3, 4])
    const frames = decodeFrames(encodeFrame(payload))
    expect(frames).toHaveLength(1)
    expect(frames[0]?.compressed).toBe(false)
    expect([...frames[0]!.payload]).toEqual([1, 2, 3, 4])
  })

  test("preserves the compressed flag", () => {
    const payload = new Uint8Array([9])
    const frames = decodeFrames(encodeFrame(payload, true))
    expect(frames[0]?.compressed).toBe(true)
    expect([...frames[0]!.payload]).toEqual([9])
  })

  test("decodes concatenated frames", () => {
    const a = encodeFrame(new Uint8Array([1]))
    const b = encodeFrame(new Uint8Array([2, 3]))
    const body = new Uint8Array(a.byteLength + b.byteLength)
    body.set(a)
    body.set(b, a.byteLength)
    const frames = decodeFrames(body)
    expect(frames).toHaveLength(2)
    expect([...frames[0]!.payload]).toEqual([1])
    expect([...frames[1]!.payload]).toEqual([2, 3])
  })

  test("rejects a truncated header", () => {
    expect(() => decodeFrames(new Uint8Array([0, 0, 0]))).toThrow(IngestError)
  })

  test("rejects a truncated payload", () => {
    const header = encodeFrame(new Uint8Array([1, 2, 3])).subarray(0, 6)
    expect(() => decodeFrames(header)).toThrow(IngestError)
  })

  test("rejects an invalid compression flag", () => {
    const frame = encodeFrame(new Uint8Array([1]))
    frame[0] = 2
    expect(() => decodeFrames(frame)).toThrow(IngestError)
  })
})
