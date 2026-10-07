@extends('admin.layout')

@section('title', 'KYC & Regulatory Compliance | Gutter Command')
@section('page_title', 'KYC & Regulatory Compliance')
@section('page_sub', 'Identity verification reviews, Tier 2 BVN/NIN checks, and document auditing')

@section('content')
<div class="card" style="margin-bottom: 24px;">
  <div class="card-header">
    <div>
      <h3 style="font-size: 15px; font-weight: 800; color: var(--navy-deep);">Pending & In-Review Customer Verifications</h3>
      <p style="font-size: 12px; color: var(--ink-soft);">Approve or reject Tier 2 & Tier 3 identification submissions</p>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Submitted Document</th>
          <th>Requested Tier</th>
          <th>Current Status</th>
          <th>Registration Date</th>
          <th>Compliance Action</th>
        </tr>
      </thead>
      <tbody>
        @forelse($pendingUsers as $user)
          <tr>
            <td>
              <div style="font-weight: 700; font-size: 13.5px;">{{ $user->first_name }} {{ $user->last_name }}</div>
              <div style="font-size: 11px; color: var(--ink-soft);">{{ $user->email }} • {{ $user->phone }}</div>
            </td>
            <td>
              <span class="mono">Government ID / BVN</span>
            </td>
            <td>
              <span style="font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 5px; background-color: #EFF6FF; color: #1D4ED8;">
                Tier 2 (₦5M/day)
              </span>
            </td>
            <td>
              <span class="badge {{ $user->kyc_status === 'verified' ? 'badge-success' : ($user->kyc_status === 'pending' ? 'badge-warning' : 'badge-info') }}">
                {{ strtoupper($user->kyc_status ?? 'UNVERIFIED') }}
              </span>
            </td>
            <td style="font-size: 12px; color: var(--ink-soft);">
              {{ $user->created_at->format('M d, Y') }}
            </td>
            <td>
              <div style="display: flex; gap: 8px;">
                <form action="{{ route('admin.users.update', $user->id) }}" method="POST">
                  @csrf
                  @method('PUT')
                  <input type="hidden" name="kyc_status" value="verified">
                  <input type="hidden" name="tier" value="2">
                  <button type="submit" style="padding: 6px 12px; border-radius: 8px; background-color: var(--mint-bg); border: 1px solid rgba(35, 211, 165, 0.4); color: var(--mint-dark); font-size: 12px; font-weight: 700; cursor: pointer;">
                    ✓ Approve Tier 2
                  </button>
                </form>

                <form action="{{ route('admin.users.update', $user->id) }}" method="POST">
                  @csrf
                  @method('PUT')
                  <input type="hidden" name="kyc_status" value="rejected">
                  <button type="submit" style="padding: 6px 12px; border-radius: 8px; background-color: var(--red-bg); border: 1px solid #FECDD3; color: var(--red); font-size: 12px; font-weight: 700; cursor: pointer;">
                    ✕ Reject
                  </button>
                </form>
              </div>
            </td>
          </tr>
        @empty
          <tr>
            <td colspan="6" style="padding: 40px; text-align: center; color: var(--ink-soft);">
              No pending KYC verification requests currently.
            </td>
          </tr>
        @endforelse
      </tbody>
    </table>
  </div>
</div>
@endsection
