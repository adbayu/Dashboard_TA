#pragma once

#include <cstdint>

namespace FirmwareStatePolicy {

enum class OperationalState : uint8_t {
  connecting,
  waitingForTime,
  running,
};

struct Decision {
  OperationalState state;
  bool samplePermitted;
};

constexpr Decision evaluate(bool wifiConnected, bool clockValid) noexcept {
  if (!clockValid) return {OperationalState::waitingForTime, false};
  if (!wifiConnected) return {OperationalState::connecting, true};
  return {OperationalState::running, true};
}

static_assert(evaluate(false, false).state == OperationalState::waitingForTime,
  "Offline devices with an invalid clock must wait for time.");
static_assert(evaluate(true, false).state == OperationalState::waitingForTime,
  "Online devices with an invalid clock must wait for time.");
static_assert(evaluate(false, true).state == OperationalState::connecting
  && evaluate(false, true).samplePermitted,
  "Offline devices with valid time must connect in the background and may sample.");
static_assert(evaluate(true, true).state == OperationalState::running,
  "Online devices with valid time may run.");
static_assert(!evaluate(false, false).samplePermitted
  && !evaluate(true, false).samplePermitted,
  "Sampling must be forbidden while waiting for valid time.");

}  // namespace FirmwareStatePolicy
