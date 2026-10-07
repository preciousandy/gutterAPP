@extends('admin.layout')

@section('title', 'Mobile App Controls & Feature Switches | Gutter Command')
@section('page_title', 'Mobile App Controls & Feature Switches')
@section('page_sub', 'Instantly toggle buttons, KYC gateways, and configure VAS/Telecom API providers')

@section('content')
<style>
  .banner {
    background-color: var(--navy-deep);
    color: #FFFFFF;
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-md);
    margin-bottom: 28px;
  }
  .banner-left {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    max-width: 850px;
  }
  .banner-icon-box {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background-color: rgba(35, 211, 165, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .banner-title {
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
  }
  .banner-desc {
    font-size: 12.5px;
    color: #CBD5E1;
    margin-top: 4px;
    line-height: 1.5;
  }
  .banner-desc code {
    background: rgba(255, 255, 255, 0.15);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--mint);
  }

  /* VAS Gateway Panel */
  .gateway-panel {
    background-color: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 32px;
  }
  .gateway-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .gateway-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .gateway-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background-color: #FEF3C7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .gateway-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--navy-deep);
  }
  .gateway-sub {
    font-size: 12px;
    color: var(--ink-soft);
  }
  .gateway-layout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 24px;
  }
  @media (max-width: 900px) {
    .gateway-layout {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .form-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--navy-deep);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .form-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background-color: var(--surface-alt);
    font-family: inherit;
    font-size: 13.5px;
    color: var(--ink);
    transition: all 0.2s ease;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--navy);
    background-color: var(--surface);
    box-shadow: 0 0 0 3px rgba(18, 48, 110, 0.1);
  }
  .input-with-button {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-action-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 700;
    color: var(--navy);
    cursor: pointer;
    border-radius: 6px;
  }
  .input-action-btn:hover {
    background-color: rgba(18, 48, 110, 0.08);
  }
  .form-hint {
    font-size: 11.5px;
    color: var(--ink-soft);
    margin-top: 2px;
  }

  /* Telemetry Card */
  .telemetry-card {
    background: linear-gradient(145deg, #0E2050, #12306E);
    border-radius: var(--radius-md);
    padding: 20px;
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
    box-shadow: var(--shadow-md);
  }
  .telemetry-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .telemetry-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(35, 211, 165, 0.2);
    color: var(--mint);
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid rgba(35, 211, 165, 0.4);
  }
  .telemetry-balance-label {
    font-size: 11px;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
  }
  .telemetry-balance-value {
    font-size: 28px;
    font-weight: 800;
    color: #FFFFFF;
    font-family: var(--font-mono);
    margin: 4px 0;
  }
  .telemetry-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: #CBD5E1;
  }
  .btn-test {
    background-color: rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  .btn-test:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  .btn-save {
    background-color: var(--navy);
    color: #FFFFFF;
    border: none;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .btn-save:hover {
    background-color: var(--navy-bright);
  }

  .group-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;
  }
  .group-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .group-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--navy-deep);
  }
  .group-sub {
    font-size: 12.5px;
    color: var(--ink-soft);
  }

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }
  .control-card {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    background-color: var(--surface);
    transition: all 0.2s ease;
  }
  .control-card.disabled-card {
    border-color: #FECDD3;
    background-color: #FFF1F2;
  }
  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .ctrl-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--navy-deep);
  }
  .ctrl-key {
    font-size: 11px;
    color: var(--ink-soft);
    margin-top: 3px;
  }
  .ctrl-desc {
    font-size: 12px;
    color: var(--ink-mid);
    line-height: 1.45;
  }

  /* Custom Switch Toggle */
  .switch-btn {
    width: 48px;
    height: 28px;
    border-radius: 999px;
    border: none;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;
    padding: 0;
    flex-shrink: 0;
  }
  .switch-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: #FFFFFF;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s ease;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--line-soft);
    padding-top: 10px;
  }
  .status-tag {
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.3px;
  }
  .meta-text {
    font-size: 11px;
    color: var(--ink-faint);
  }

  /* ==================================== */
  /* Fee Control Center Styles            */
  /* ==================================== */
  .fee-control-panel {
    background-color: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 32px;
  }
  .fee-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 20px;
  }
  .fee-tab-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .fee-tab-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid var(--line);
    background-color: var(--chip);
    color: var(--navy-deep);
    transition: all 0.2s ease;
  }
  .fee-tab-btn.active-tab {
    background-color: var(--navy-deep);
    color: #FFFFFF;
    border-color: var(--navy-deep);
  }
  .fee-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }
  .fee-card {
    background-color: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
  }
  .fee-card:hover {
    border-color: var(--navy-bright);
    box-shadow: var(--shadow-md);
  }
  .fee-card.disabled-fee-card {
    border-color: #FECDD3;
    background-color: #FFF5F5;
  }
  .fee-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .fee-icon {
    font-size: 24px;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background-color: var(--chip);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .fee-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--navy-deep);
  }
  .fee-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 2px 7px;
    border-radius: 4px;
    margin-top: 3px;
  }
  .badge-transfers { background-color: #E0E7FF; color: #3730A3; }
  .badge-cards { background-color: #EDE9FE; color: #5B21B6; }
  .badge-crypto { background-color: #FEF3C7; color: #92400E; }
  .badge-bills { background-color: #DCFCE7; color: #166534; }
  .fee-desc {
    font-size: 12px;
    color: var(--ink-mid);
    line-height: 1.4;
  }
  .fee-inputs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background-color: var(--surface-alt);
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--line-soft);
  }
  .fee-input-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fee-input-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .fee-input-wrap {
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  .fee-input-wrap:focus-within {
    border-color: var(--navy);
    box-shadow: 0 0 0 2px rgba(18, 48, 110, 0.1);
  }
  .fee-input-prefix, .fee-input-suffix {
    padding: 6px 9px;
    background-color: var(--chip);
    font-size: 12px;
    font-weight: 800;
    color: var(--navy-deep);
  }
  .fee-input-field {
    width: 100%;
    border: none;
    outline: none;
    padding: 6px 8px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink);
    font-family: var(--font-mono);
  }
  .fee-sim-box {
    background-color: #F8FAFC;
    border: 1px dashed var(--line);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 11.5px;
  }
  .fee-sim-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .fee-sim-title strong {
    color: var(--navy-deep);
    font-size: 13px;
    font-family: var(--font-mono);
  }
  .fee-sim-calc {
    color: var(--ink-faint);
    font-size: 11px;
    margin-top: 2px;
  }
  .fee-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--line-soft);
    padding-top: 12px;
  }
  .btn-save-single {
    background-color: var(--navy-deep);
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-save-single:hover {
    background-color: var(--navy-bright);
  }
  .btn-batch-save {
    background-color: var(--mint-dark);
    color: #062B22;
    border: none;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }
  .btn-batch-save:hover {
    background-color: var(--mint);
  }
  .admin-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: var(--navy-deep);
    color: #FFFFFF;
    padding: 14px 20px;
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13.5px;
    font-weight: 700;
    z-index: 9999;
    border-left: 4px solid var(--mint);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .admin-toast.show {
    transform: translateY(0);
    opacity: 1;
  }
</style>

<!-- Live Sync Banner -->
<div class="banner">
  <div class="banner-left">
    <div class="banner-icon-box">📡</div>
    <div>
      <div class="banner-title">Live Mobile App Feature & Gateway Switches</div>
      <div class="banner-desc">
        Changes made here propagate to all mobile devices immediately via the <code>/api/v1/app/config</code> feed.
        Configure API keys, toggle service buttons, and enforce KYC verification rules on specific features in 1-click.
      </div>
    </div>
  </div>
</div>

<!-- ============================================== -->
<!-- 0. Services, Fees & Operational Controls       -->
<!-- ============================================== -->
<form action="{{ route('admin.app_controls.fees_batch') }}" method="POST" id="feesBatchForm">
  @csrf
  <div class="fee-control-panel">
    <div class="fee-panel-header">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background-color: var(--mint-bg); display: flex; align-items: center; justify-content: center; font-size: 22px;">
          💰
        </div>
        <div>
          <h2 style="font-size: 18px; font-weight: 800; color: var(--navy-deep); margin: 0;">Services, Fees & Charges Control Center</h2>
          <p style="font-size: 12.5px; color: var(--ink-soft); margin: 4px 0 0 0;">
            Manage operational status, flat fees (₦), and percentage fees (%) for Bank Transfers, Gutter-to-Gutter, Virtual Cards, Crypto, Airtime & Data.
          </p>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <button type="submit" class="btn-batch-save">
          <span>💾 Save All Fee Settings</span>
        </button>
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="fee-tab-filters">
      <button type="button" class="fee-tab-btn active-tab" onclick="filterFeeCategory('all', this)">All Services ({{ count($feeSettings) }})</button>
      <button type="button" class="fee-tab-btn" onclick="filterFeeCategory('transfers', this)">Bank & P2P ({{ collect($feeSettings)->where('category', 'transfers')->count() }})</button>
      <button type="button" class="fee-tab-btn" onclick="filterFeeCategory('cards', this)">Virtual Cards ({{ collect($feeSettings)->where('category', 'cards')->count() }})</button>
      <button type="button" class="fee-tab-btn" onclick="filterFeeCategory('crypto', this)">Crypto Operations ({{ collect($feeSettings)->where('category', 'crypto')->count() }})</button>
      <button type="button" class="fee-tab-btn" onclick="filterFeeCategory('bills', this)">Bills & Utilities ({{ collect($feeSettings)->where('category', 'bills')->count() }})</button>
    </div>

    <!-- Service Cards Grid -->
    <div class="fee-grid">
      @foreach($feeSettings as $key => $item)
        <div class="fee-card {{ $item['is_enabled'] ? '' : 'disabled-fee-card' }}" data-category="{{ $item['category'] }}" id="fee-card-{{ $key }}">
          <!-- Header -->
          <div class="fee-card-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="fee-icon">{{ $item['icon'] }}</span>
              <div>
                <div class="fee-title">{{ $item['label'] }}</div>
                <span class="fee-badge badge-{{ $item['category'] }}">{{ $item['category_label'] }}</span>
              </div>
            </div>

            <!-- Active / Paused Switch -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <input type="hidden" name="fees[{{ $key }}][is_enabled]" id="fee_enabled_{{ $key }}" value="{{ $item['is_enabled'] ? '1' : '0' }}">
              <button
                type="button"
                class="switch-btn"
                id="fee_btn_{{ $key }}"
                style="background-color: {{ $item['is_enabled'] ? 'var(--mint-dark)' : '#CBD5E1' }};"
                onclick="toggleFeeSwitch('{{ $key }}')"
                title="Toggle service active status"
              >
                <div
                  class="switch-thumb"
                  id="fee_thumb_{{ $key }}"
                  style="transform: {{ $item['is_enabled'] ? 'translateX(20px)' : 'translateX(0)' }};"
                ></div>
              </button>
            </div>
          </div>

          <div class="fee-desc">{{ $item['description'] }}</div>

          <!-- Inputs Grid -->
          <div class="fee-inputs-grid">
            <div class="fee-input-col">
              <label class="fee-input-label" for="flat_{{ $key }}">Flat Fee Charge</label>
              <div class="fee-input-wrap">
                <span class="fee-input-prefix">₦</span>
                <input
                  type="number"
                  name="fees[{{ $key }}][flat_fee]"
                  id="flat_{{ $key }}"
                  class="fee-input-field"
                  value="{{ number_format($item['flat_fee'], 2, '.', '') }}"
                  min="0"
                  step="0.01"
                  oninput="updateFeePreview('{{ $key }}')"
                  placeholder="0.00"
                >
              </div>
            </div>

            <div class="fee-input-col">
              <label class="fee-input-label" for="percent_{{ $key }}">Percentage Fee</label>
              <div class="fee-input-wrap">
                <input
                  type="number"
                  name="fees[{{ $key }}][percent_fee]"
                  id="percent_{{ $key }}"
                  class="fee-input-field"
                  value="{{ number_format($item['percent_fee'], 2, '.', '') }}"
                  min="0"
                  max="100"
                  step="0.01"
                  oninput="updateFeePreview('{{ $key }}')"
                  placeholder="0.00"
                >
                <span class="fee-input-suffix">%</span>
              </div>
            </div>
          </div>

          <!-- Dynamic Live Simulation Box -->
          <div class="fee-sim-box" id="sim_{{ $key }}">
            <div class="fee-sim-title">
              <span>💡 Simulated on ₦10,000:</span>
              <strong id="sim_total_{{ $key }}">₦0.00</strong>
            </div>
            <div class="fee-sim-calc" id="sim_breakdown_{{ $key }}">
              ₦0.00 flat + ₦0.00 (0%)
            </div>
          </div>

          <!-- Footer -->
          <div class="fee-card-footer">
            <div>
              <span
                class="status-tag"
                id="fee_status_{{ $key }}"
                style="background-color: {{ $item['is_enabled'] ? 'var(--mint-bg)' : '#FFE4E6' }}; color: {{ $item['is_enabled'] ? 'var(--mint-dark)' : 'var(--red)' }};"
              >
                {{ $item['is_enabled'] ? '● Operational' : '○ Paused / Maintenance' }}
              </span>
              <div class="meta-text" style="margin-top: 4px;" id="fee_meta_{{ $key }}">
                {{ $item['updated_by'] ? 'Updated by ' . $item['updated_by'] : 'Default' }}
              </div>
            </div>

            <button
              type="button"
              class="btn-save-single"
              id="save_btn_{{ $key }}"
              onclick="saveSingleFee('{{ $key }}')"
            >
              <span>Save</span>
            </button>
          </div>
        </div>
      @endforeach
    </div>
  </div>
</form>

<!-- Toast Container -->
<div id="adminToast" class="admin-toast">
  <span>✓</span>
  <span id="adminToastMsg">Settings updated successfully!</span>
</div>

<!-- ============================================== -->
<!-- 1. Telecom & VAS API Gateway (Bigisub / VTpass) -->
<!-- ============================================== -->
<div class="gateway-panel">
  <div class="gateway-header">
    <div class="gateway-title-group">
      <div class="gateway-icon">⚡</div>
      <div>
        <h2 class="gateway-title">Default Telecom & VAS API Configuration</h2>
        <p class="gateway-sub">Configure the active vendor API for vending Airtime and Mobile Data bundles across all networks</p>
      </div>
    </div>

    <div>
      @if($vasProvider === 'bigisub')
        <span class="telemetry-badge" style="background-color: var(--mint-bg); color: var(--mint-dark); border-color: rgba(35,211,165,0.4);">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--mint); box-shadow:0 0 6px var(--mint);"></span>
          Bigisub.ng Active (Default)
        </span>
      @else
        <span class="telemetry-badge" style="background-color: #FEF3C7; color: #B45309; border-color: #FCD34D;">
          VTpass Sandbox / Direct Active
        </span>
      @endif
    </div>
  </div>

  <div class="gateway-layout">
    <!-- Left: Credentials Form -->
    <div>
      <form action="{{ route('admin.app_controls.vas_settings') }}" method="POST">
        @csrf

        <div class="form-group">
          <label class="form-label" for="vas_provider">Active Airtime & Data Gateway Provider</label>
          <select name="vas_provider" id="vas_provider" class="form-input">
            <option value="bigisub" {{ $vasProvider === 'bigisub' ? 'selected' : '' }}>
              🚀 Bigisub.ng (Primary Engine - Lowest SME Data Rates)
            </option>
            <option value="vtpass" {{ $vasProvider === 'vtpass' ? 'selected' : '' }}>
              VTpass.com (Secondary / Alternative Rails)
            </option>
          </select>
          <div class="form-hint">Selected provider will handle all mobile top-up and data subscriptions.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="bigisub_api_key">Bigisub API Token / Key</label>
          <div class="input-with-button">
            <input
              type="password"
              name="bigisub_api_key"
              id="bigisub_api_key"
              class="form-input mono"
              value="{{ old('bigisub_api_key', $bigisubApiKey) }}"
              required
              placeholder="e.g. f89dca9d3c0814c375320ddfda09d91ce0bb10e5"
            >
            <button type="button" class="input-action-btn" onclick="toggleSecretVisibility('bigisub_api_key')">
              Show / Hide
            </button>
          </div>
          <div class="form-hint">Generated under your <strong>Bigisub.ng</strong> account Developer / API settings.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="bigisub_pin">Bigisub 4-Digit Account PIN</label>
          <div class="input-with-button">
            <input
              type="password"
              name="bigisub_pin"
              id="bigisub_pin"
              class="form-input mono"
              maxlength="4"
              value="{{ old('bigisub_pin', $bigisubPin) }}"
              placeholder="4-digit PIN (e.g. 1234)"
            >
            <button type="button" class="input-action-btn" onclick="toggleSecretVisibility('bigisub_pin')">
              Show / Hide
            </button>
          </div>
          <div class="form-hint">The 4-digit transaction authorization PIN configured on your Bigisub vendor account.</div>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--navy-deep);">
            <input
              type="checkbox"
              name="allow_fallback"
              value="1"
              {{ $allowFallback ? 'checked' : '' }}
              style="width: 16px; height: 16px; cursor: pointer;"
            >
            Enable automatic failover to VTpass if Bigisub experiences downtime
          </label>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 18px;">
          <button type="submit" class="btn-save">
            💾 Save API Credentials
          </button>
          <button type="button" class="btn-test" onclick="testBigisubConnection()" style="background-color: var(--chip); color: var(--navy-deep); border-color: var(--line);">
            🔄 Test Connection Live
          </button>
        </div>
      </form>
    </div>

    <!-- Right: Telemetry & Live Vendor Float Card -->
    <div>
      <div class="telemetry-card">
        <div class="telemetry-top">
          <span style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Bigisub Vendor Telemetry</span>
          <span class="telemetry-badge" id="telemetryStatusBadge">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color: {{ ($bigisubStatus['success'] ?? false) ? 'var(--mint)' : '#F43F5E' }};"></span>
            <span id="telemetryStatusText">{{ ($bigisubStatus['success'] ?? false) ? 'Connected' : 'Action Required' }}</span>
          </span>
        </div>

        <div>
          <div class="telemetry-balance-label">Available Vendor Float</div>
          <div class="telemetry-balance-value" id="telemetryBalance">
            ₦{{ number_format($bigisubStatus['balance'] ?? 0, 2) }}
          </div>
          @if(($bigisubStatus['balance'] ?? 0) <= 0)
            <div id="floatAlert" style="font-size: 11.5px; background: rgba(225, 29, 72, 0.25); border: 1px solid rgba(225, 29, 72, 0.4); padding: 6px 10px; border-radius: 8px; margin-top: 6px; color: #FECDD3;">
              ⚠️ Float is ₦0.00: Fund your Bigisub wallet via bank transfer on bigisub.ng to vend to users.
            </div>
          @else
            <div id="floatAlert" style="font-size: 11.5px; color: var(--mint); margin-top: 4px;">
              ✓ Float balance ready for automated mobile app dispatches.
            </div>
          @endif
        </div>

        <div>
          <div class="telemetry-info-row">
            <span>Account Holder</span>
            <strong id="telemetryAccountName">{{ $bigisubStatus['account_name'] ?? 'Andy Precious' }}</strong>
          </div>
          <div class="telemetry-info-row">
            <span>Username / Email</span>
            <span id="telemetryUsername">{{ $bigisubStatus['username'] ?? 'andyprecious6' }}</span>
          </div>
          <div class="telemetry-info-row">
            <span>Base Server URL</span>
            <code style="font-size: 11px; color: #93C5FD;">api.bigisub.ng</code>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; padding-top: 4px;">
          <button type="button" class="btn-test" id="telemetryRefreshBtn" onclick="testBigisubConnection()">
            <span>⚡ Refresh Status</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============================================== -->
<!-- 1. Mobile App Buttons & Services               -->
<!-- ============================================== -->
<div class="group-section">
  <div class="group-header">
    <div class="group-title-row">
      <span>📱</span>
      <h2 class="group-title">Mobile App Buttons & Services</h2>
    </div>
    <p class="group-sub">Control which service buttons and purchase flows are visible and operational on user mobile devices.</p>
  </div>

  <div class="controls-grid">
    @foreach($controls->where('category', 'buttons') as $ctrl)
      <div class="control-card {{ $ctrl->is_enabled ? '' : 'disabled-card' }}" id="card-{{ $ctrl->key }}">
        <div class="card-top">
          <div>
            <div class="ctrl-label">{{ $ctrl->label }}</div>
            <div class="ctrl-key"><code>{{ $ctrl->key }}</code></div>
          </div>

          <button
            type="button"
            class="switch-btn"
            style="background-color: {{ $ctrl->is_enabled ? 'var(--mint-dark)' : '#CBD5E1' }};"
            onclick="toggleSwitch('{{ $ctrl->key }}')"
            id="btn-{{ $ctrl->key }}"
          >
            <div
              class="switch-thumb"
              style="transform: {{ $ctrl->is_enabled ? 'translateX(20px)' : 'translateX(0)' }};"
              id="thumb-{{ $ctrl->key }}"
            ></div>
          </button>
        </div>

        <div class="ctrl-desc">{{ $ctrl->description }}</div>

        <div class="card-footer">
          <span
            class="status-tag"
            id="tag-{{ $ctrl->key }}"
            style="background-color: {{ $ctrl->is_enabled ? 'var(--mint-bg)' : '#FFE4E6' }}; color: {{ $ctrl->is_enabled ? 'var(--mint-dark)' : 'var(--red)' }};"
          >
            {{ $ctrl->is_enabled ? '● Active on Mobile' : '○ Hidden / Disabled' }}
          </span>
          <span class="meta-text" id="meta-{{ $ctrl->key }}">
            {{ $ctrl->updated_by ? 'By: ' . $ctrl->updated_by : 'Default' }}
          </span>
        </div>
      </div>
    @endforeach
  </div>
</div>

<!-- ============================================== -->
<!-- 2. KYC & Compliance Gateways                   -->
<!-- ============================================== -->
<div class="group-section">
  <div class="group-header">
    <div class="group-title-row">
      <span>🛡️</span>
      <h2 class="group-title">KYC & Regulatory Gateways</h2>
    </div>
    <p class="group-sub">Enforce mandatory BVN/NIN verification before users are permitted to perform high-risk financial actions.</p>
  </div>

  <div class="controls-grid">
    @foreach($controls->where('category', 'kyc') as $ctrl)
      <div class="control-card {{ $ctrl->is_enabled ? '' : 'disabled-card' }}" id="card-{{ $ctrl->key }}" style="background-color: {{ $ctrl->is_enabled ? '#EFF6FF' : 'var(--surface)' }};">
        <div class="card-top">
          <div>
            <div class="ctrl-label">{{ $ctrl->label }}</div>
            <div class="ctrl-key"><code>{{ $ctrl->key }}</code></div>
          </div>

          <button
            type="button"
            class="switch-btn"
            style="background-color: {{ $ctrl->is_enabled ? '#2563EB' : '#CBD5E1' }};"
            onclick="toggleSwitch('{{ $ctrl->key }}')"
            id="btn-{{ $ctrl->key }}"
          >
            <div
              class="switch-thumb"
              style="transform: {{ $ctrl->is_enabled ? 'translateX(20px)' : 'translateX(0)' }};"
              id="thumb-{{ $ctrl->key }}"
            ></div>
          </button>
        </div>

        <div class="ctrl-desc">{{ $ctrl->description }}</div>

        <div class="card-footer">
          <span
            class="status-tag"
            id="tag-{{ $ctrl->key }}"
            style="background-color: {{ $ctrl->is_enabled ? '#DBEAFE' : 'var(--chip)' }}; color: {{ $ctrl->is_enabled ? '#1D4ED8' : 'var(--ink-soft)' }};"
          >
            {{ $ctrl->is_enabled ? '🔒 Mandatory Enforced' : '🔓 Optional / Relaxed' }}
          </span>
          <span class="meta-text" id="meta-{{ $ctrl->key }}">
            {{ $ctrl->updated_by ? 'By: ' . $ctrl->updated_by : 'Default' }}
          </span>
        </div>
      </div>
    @endforeach
  </div>
</div>

<!-- ============================================== -->
<!-- 3. Global System & Maintenance Controls        -->
<!-- ============================================== -->
<div class="group-section">
  <div class="group-header">
    <div class="group-title-row">
      <span>🚨</span>
      <h2 class="group-title">Global System State & Emergency Switches</h2>
    </div>
    <p class="group-sub">Emergency circuit breakers and scheduled maintenance control.</p>
  </div>

  <div class="controls-grid">
    @foreach($controls->where('category', 'system') as $ctrl)
      <div class="control-card {{ $ctrl->is_enabled ? 'disabled-card' : '' }}" id="card-{{ $ctrl->key }}">
        <div class="card-top">
          <div>
            <div class="ctrl-label">{{ $ctrl->label }}</div>
            <div class="ctrl-key"><code>{{ $ctrl->key }}</code></div>
          </div>

          <button
            type="button"
            class="switch-btn"
            style="background-color: {{ $ctrl->is_enabled ? 'var(--red)' : '#CBD5E1' }};"
            onclick="toggleSwitch('{{ $ctrl->key }}')"
            id="btn-{{ $ctrl->key }}"
          >
            <div
              class="switch-thumb"
              style="transform: {{ $ctrl->is_enabled ? 'translateX(20px)' : 'translateX(0)' }};"
              id="thumb-{{ $ctrl->key }}"
            ></div>
          </button>
        </div>

        <div class="ctrl-desc">{{ $ctrl->description }}</div>

        <div class="card-footer">
          <span
            class="status-tag"
            id="tag-{{ $ctrl->key }}"
            style="background-color: {{ $ctrl->is_enabled ? '#FFE4E6' : 'var(--chip)' }}; color: {{ $ctrl->is_enabled ? 'var(--red)' : 'var(--ink-soft)' }};"
          >
            {{ $ctrl->is_enabled ? '⚠️ ACTIVE EMERGENCY OVERRIDE' : 'Normal Operation' }}
          </span>
          <span class="meta-text" id="meta-{{ $ctrl->key }}">
            {{ $ctrl->updated_by ? 'By: ' . $ctrl->updated_by : 'Default' }}
          </span>
        </div>
      </div>
    @endforeach
  </div>
</div>
@endsection

@section('scripts')
<script>
  function toggleSecretVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  async function testBigisubConnection() {
    const btn = document.getElementById('telemetryRefreshBtn');
    const balanceElem = document.getElementById('telemetryBalance');
    const badge = document.getElementById('telemetryStatusBadge');
    const badgeText = document.getElementById('telemetryStatusText');
    const accountName = document.getElementById('telemetryAccountName');
    const username = document.getElementById('telemetryUsername');
    const alertBox = document.getElementById('floatAlert');

    if (btn) btn.innerText = 'Connecting...';

    try {
      const response = await fetch("{{ route('admin.app_controls.test_bigisub') }}", {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        const bal = parseFloat(data.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
        balanceElem.innerText = '₦' + bal;
        accountName.innerText = data.account_name || 'Bigisub Account';
        username.innerText = data.username || data.email || 'Verified';

        badge.style.backgroundColor = 'rgba(35, 211, 165, 0.2)';
        badge.style.color = 'var(--mint)';
        badgeText.innerText = 'Connected Live';

        if (data.balance <= 0) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(225, 29, 72, 0.25)';
          alertBox.style.color = '#FECDD3';
          alertBox.innerText = '⚠️ Float is ₦0.00: Fund your Bigisub wallet via bank transfer on bigisub.ng to vend to users.';
        } else {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(35, 211, 165, 0.15)';
          alertBox.style.color = 'var(--mint)';
          alertBox.innerText = '✓ Float balance ready for automated mobile app dispatches.';
        }
      } else {
        badge.style.backgroundColor = 'rgba(225, 29, 72, 0.25)';
        badge.style.color = '#F43F5E';
        badgeText.innerText = 'Connection Error';
        alertBox.style.display = 'block';
        alertBox.innerText = 'Error: ' + (data.message || 'Could not verify Bigisub credentials.');
      }
    } catch (e) {
      badgeText.innerText = 'Network Error';
    } finally {
      if (btn) btn.innerText = '⚡ Refresh Status';
    }
  }

  async function toggleSwitch(key) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const btn = document.getElementById('btn-' + key);
    const thumb = document.getElementById('thumb-' + key);
    const card = document.getElementById('card-' + key);
    const tag = document.getElementById('tag-' + key);
    const meta = document.getElementById('meta-' + key);

    btn.style.opacity = '0.5';

    try {
      const response = await fetch(`/admin/app-controls/${key}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const isEnabled = data.is_enabled;

        // Animate switch
        thumb.style.transform = isEnabled ? 'translateX(20px)' : 'translateX(0)';
        btn.style.backgroundColor = isEnabled ? 'var(--mint-dark)' : '#CBD5E1';

        // Update card styles
        if (isEnabled) {
          card.classList.remove('disabled-card');
          tag.innerText = '● Active on Mobile';
          tag.style.backgroundColor = 'var(--mint-bg)';
          tag.style.color = 'var(--mint-dark)';
        } else {
          card.classList.add('disabled-card');
          tag.innerText = '○ Hidden / Disabled';
          tag.style.backgroundColor = '#FFE4E6';
          tag.style.color = 'var(--red)';
        }

        if (meta && data.updated_by) {
          meta.innerText = 'By: ' + data.updated_by;
        }
      } else {
        alert(data.message || 'Could not update control switch.');
      }
    } catch (e) {
      alert('Network error while toggling switch.');
    } finally {
      btn.style.opacity = '1';
    }
  }

  // ============================================
  // Fee Control Center Scripts
  // ============================================
  function showAdminToast(msg) {
    const toast = document.getElementById('adminToast');
    const toastMsg = document.getElementById('adminToastMsg');
    if (!toast || !toastMsg) return;

    toastMsg.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  function updateFeePreview(key) {
    const flatInput = document.getElementById('flat_' + key);
    const percentInput = document.getElementById('percent_' + key);
    const totalElem = document.getElementById('sim_total_' + key);
    const breakdownElem = document.getElementById('sim_breakdown_' + key);

    if (!flatInput || !percentInput || !totalElem || !breakdownElem) return;

    const flat = parseFloat(flatInput.value) || 0;
    const percent = parseFloat(percentInput.value) || 0;
    const baseSample = 10000.00;
    const percentAmount = baseSample * (percent / 100.0);
    const totalFee = flat + percentAmount;

    totalElem.innerText = '₦' + totalFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    breakdownElem.innerText = `₦${flat.toLocaleString('en-NG', { minimumFractionDigits: 2 })} flat + ₦${percentAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} (${percent}%)`;
  }

  function toggleFeeSwitch(key) {
    const input = document.getElementById('fee_enabled_' + key);
    const btn = document.getElementById('fee_btn_' + key);
    const thumb = document.getElementById('fee_thumb_' + key);
    const card = document.getElementById('fee-card-' + key);
    const statusTag = document.getElementById('fee_status_' + key);

    if (!input || !btn || !thumb) return;

    const isCurrentlyEnabled = input.value === '1';
    const nextState = !isCurrentlyEnabled;

    input.value = nextState ? '1' : '0';

    // Animate switch
    thumb.style.transform = nextState ? 'translateX(20px)' : 'translateX(0)';
    btn.style.backgroundColor = nextState ? 'var(--mint-dark)' : '#CBD5E1';

    if (nextState) {
      card.classList.remove('disabled-fee-card');
      statusTag.innerText = '● Operational';
      statusTag.style.backgroundColor = 'var(--mint-bg)';
      statusTag.style.color = 'var(--mint-dark)';
    } else {
      card.classList.add('disabled-fee-card');
      statusTag.innerText = '○ Paused / Maintenance';
      statusTag.style.backgroundColor = '#FFE4E6';
      statusTag.style.color = 'var(--red)';
    }

    // Auto-save on toggle
    saveSingleFee(key, true);
  }

  async function saveSingleFee(key, isSilent = false) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const flatInput = document.getElementById('flat_' + key);
    const percentInput = document.getElementById('percent_' + key);
    const enabledInput = document.getElementById('fee_enabled_' + key);
    const saveBtn = document.getElementById('save_btn_' + key);
    const metaElem = document.getElementById('fee_meta_' + key);

    if (!flatInput || !percentInput) return;

    const flatFee = parseFloat(flatInput.value) || 0;
    const percentFee = parseFloat(percentInput.value) || 0;
    const isEnabled = enabledInput ? enabledInput.value === '1' : true;

    if (saveBtn) {
      saveBtn.innerText = 'Saving...';
      saveBtn.disabled = true;
    }

    try {
      const response = await fetch(`/admin/app-controls/fees/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          flat_fee: flatFee,
          percent_fee: percentFee,
          is_enabled: isEnabled,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        if (!isSilent) {
          showAdminToast(res.message || 'Fee settings saved!');
        }
        if (metaElem && res.data && res.data.updated_by) {
          metaElem.innerText = 'Updated by ' + res.data.updated_by;
        }
        if (saveBtn) {
          saveBtn.innerText = '✓ Saved';
          setTimeout(() => {
            saveBtn.innerText = 'Save';
            saveBtn.disabled = false;
          }, 1800);
        }
      } else {
        alert(res.message || 'Could not save fee configuration.');
        if (saveBtn) {
          saveBtn.innerText = 'Save';
          saveBtn.disabled = false;
        }
      }
    } catch (err) {
      alert('Network error while saving fee configuration.');
      if (saveBtn) {
        saveBtn.innerText = 'Save';
        saveBtn.disabled = false;
      }
    }
  }

  function filterFeeCategory(cat, btn) {
    document.querySelectorAll('.fee-tab-btn').forEach(b => b.classList.remove('active-tab'));
    if (btn) btn.classList.add('active-tab');

    const cards = document.querySelectorAll('.fee-card');
    cards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      if (cat === 'all' || cardCat === cat) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Initialize fee calculation previews on page load
  document.addEventListener('DOMContentLoaded', () => {
    ['bank_transfer', 'gutter_to_gutter', 'card_creation', 'send_crypto', 'convert_crypto', 'buy_crypto', 'airtime', 'data'].forEach(k => {
      updateFeePreview(k);
    });
  });
</script>
@endsection
