// src/stores/seatAvailabilityStore.js
import axios from "axios";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSeatAvailabilityStore = defineStore("seatAvailability", () => {
	// 상태 변수들
	const selectedDate = ref(null); // 사용자가 선택한 날짜
	const historyList = ref([]); // 선택한 날짜와 스케줄 ID에 따른 좌석 가용성 데이터
	const loading = ref(false); // 데이터 로딩 상태
	const error = ref(null); // 에러 상태

	// 날짜 포맷팅 함수
	const formatDate = (date) => {
		const year = date.getFullYear();
		const month = `0${date.getMonth() + 1}`.slice(-2); // 월은 0부터 시작하므로 +1
		const day = `0${date.getDate()}`.slice(-2);
		return `${year}-${month}-${day}`;
	};

	// 목업 데이터 정의 (새로운 구조로 변경)
	const mockData = {
		"2024-10-01": [
			{
				scheduleId: 1,
				time: "10:00",
				actorNames: ["이석훈", "정성화"],
				sections: [
					{
						section: "R",
						availableSeats: 30,
						bookedSeats: ["R1", "R2", "R3", "R100"],
					},
					{
						section: "S",
						availableSeats: 50,
						bookedSeats: ["S1", "S2", "S3", "S100"],
					},
					{
						section: "A",
						availableSeats: 80,
						bookedSeats: ["A1", "A2", "A3", "A100"],
					},
				],
			},
			{
				scheduleId: 2,
				time: "17:00",
				actorNames: ["김호영", "최재림"],
				sections: [
					{ section: "R", availableSeats: 30 },
					{ section: "S", availableSeats: 50 },
					{ section: "A", availableSeats: 80 },
				],
			},
		],
		"2024-10-05": [
			{
				scheduleId: 3,
				time: "18:00",
				actorNames: ["김호영", "최재림"],
				sections: [
					{ section: "R", availableSeats: 45 },
					{ section: "S", availableSeats: 33 },
					{ section: "A", availableSeats: 18 },
				],
			},
			{
				scheduleId: 4,
				time: "14:00",
				actorNames: ["박수정", "김동현", "조은정"],
				sections: [
					{ section: "R", availableSeats: 25 },
					{ section: "S", availableSeats: 5 },
					{ section: "A", availableSeats: 10 },
				],
			},
		],
		"2024-10-10": [
			{
				scheduleId: 5,
				time: "19:30",
				actorNames: ["이준혁", "최수민", "박지연"],
				sections: [
					{ section: "R", availableSeats: 40 },
					{ section: "S", availableSeats: 30 },
					{ section: "A", availableSeats: 25 },
				],
			},
			{
				scheduleId: 6,
				time: "11:00",
				actorNames: ["유현주", "장은지", "이성호"],
				sections: [
					{ section: "R", availableSeats: 60 },
					{ section: "S", availableSeats: 20 },
					{ section: "A", availableSeats: 40 },
				],
			},
		],
		"2024-10-15": [
			{
				scheduleId: 7,
				time: "20:00",
				actorNames: ["장민재", "한수빈", "최희진"],
				sections: [
					{ section: "R", availableSeats: 50 },
					{ section: "S", availableSeats: 40 },
					{ section: "A", availableSeats: 22 },
				],
			},
			{
				scheduleId: 8,
				time: "15:00",
				actorNames: ["서민수", "김하영", "박재현"],
				sections: [
					{ section: "R", availableSeats: 30 },
					{ section: "S", availableSeats: 10 },
					{ section: "A", availableSeats: 10 },
				],
			},
			{
				scheduleId: 9,
				time: "10:00",
				actorNames: ["유승현", "홍기범", "강찬"],
				sections: [
					{ section: "R", availableSeats: 70 },
					{ section: "S", availableSeats: 30 },
					{ section: "A", availableSeats: 50 },
				],
			},
		],
	};

	/**
	 * 특정 scheduleId에 해당하는 날짜를 반환하는 함수
	 * @param {Number} scheduleId - 스케줄 ID
	 * @returns {String|null} - 날짜 문자열 (YYYY-MM-DD) 또는 null
	 */
	const getDateByScheduleId = (scheduleId) => {
		for (const date in mockData) {
			const schedules = mockData[date];
			const schedule = schedules.find((s) => s.scheduleId === scheduleId);
			if (schedule) {
				return date;
			}
		}
		return null;
	};

	/**
	 * 특정 scheduleId의 예약된 좌석 코드를 반환하는 함수
	 * @param {Number} scheduleId - 스케줄 ID
	 * @returns {Array} - 예약된 좌석 코드 배열
	 */
	const getBookedSeats = (scheduleId) => {
		// 우선 목업 데이터에서 찾기
		for (const date in mockData) {
			const schedules = mockData[date];
			const schedule = schedules.find((s) => s.scheduleId === scheduleId);
			if (schedule) {
				let booked = [];
				schedule.sections.forEach((section) => {
					if (section.bookedSeats) {
						booked = booked.concat(section.bookedSeats);
					}
				});
				return booked;
			}
		}

		// API 호출로 받은 데이터에서 찾기
		if (historyList.value.length > 0) {
			const schedule = historyList.value.find(
				(s) => s.scheduleId === scheduleId
			);
			if (schedule && schedule.sections) {
				let booked = [];
				schedule.sections.forEach((section) => {
					if (section.bookedSeats) {
						booked = booked.concat(section.bookedSeats);
					}
				});
				return booked;
			}
		}

		return [];
	};

	// 지정된 뮤지컬 ID와 날짜에 따라 API를 호출하여 좌석 가용성 데이터를 불러오는 함수
	// API 호출 실패 시 목업 데이터를 사용하여 historyList를 설정.
	const fetchSeatAvailability = async (musicalId, date) => {
		selectedDate.value = date;
		loading.value = true;
		error.value = null;

		console.log("날짜:", date);

		// 날짜 형식 변환 (YYYY-MM-DD)
		const dateStr = formatDate(date);
		console.log("날짜 문자열:", dateStr);

		try {
			// 실제 API 호출 시도
			const response = await axios.get(
				`/api/musicals/${musicalId}/seats-availability`,
				{
					params: { date: dateStr },
				}
			);

			if (response.data.resultCode === 200) {
				// 서버에서 받은 데이터를 historyList에 저장
				historyList.value = response.data.result;
				console.log("historyList:", historyList.value);
				console.log("seats-availability API 호출 성공:");
			} else {
				throw new Error(
					response.data.resultMsg || "seats-availability API 호출 실패"
				);
			}
		} catch (apiError) {
			// API 호출 실패 시 목업 데이터 사용
			console.warn(
				"seats-availability API 호출 실패, 목업 데이터를 사용합니다:"
			);
			historyList.value = mockData[dateStr] || [];
			console.log(
				"seatAvailability store - mockData[dateStr]",
				mockData[dateStr]
			);
			error.value = apiError;
		} finally {
			loading.value = false;
		}
	};

	return {
		selectedDate,
		historyList,
		loading,
		error,
		fetchSeatAvailability,
		getBookedSeats,
		getDateByScheduleId,
	};
});
