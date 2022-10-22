javascript: (async function () {
  function getUrl(endpoint) {
    let path = window.location.pathname.split("/");
    return `https://${window.location.hostname}/${path[1]}/${path[2]}/${endpoint}`;
  }

  function filterCleanOutput(str) {
    str = String(str);
    str = str.replaceAll("<uu5string/>", "");
    str = str.replaceAll("\n", " ");
    str = str.replaceAll('"', "'");
    str = str.replace(/\$\d/g, "_");
    str = str.replaceAll("<UU5.Bricks.U>", "");
    str = str.replaceAll("</UU5.Bricks.U>", "");
    str = str.trim();
    return str;
  }

  async function getTopics(headers) {
    const url = getUrl("loadCourseForStudent");
    const data = await fetch(url, { headers }).then((d) => d.json());
    return data.course.blockList
      .map((block) => {
        return block.topicList.map((topic) => {
          return topic.code;
        });
      })
      .flat();
  }

  async function getLessonList(code, headers) {
    const url = getUrl(`loadTopicForStudent?code=${code}`);
    const data = await fetch(url, { headers }).then((d) => d.json());
    return data.lessonList.map((lesson) => lesson.code);
  }

  async function getLesson(code, headers) {
    const data = await fetch(getUrl(`loadLessonForStudent?code=${code}`), {
      headers,
    });
    return await data.json();
  }

  function formatLessons(lessons) {
    return lessons
      .map((lesson) => {
        const questions = Object.values(lesson.questionMap);
        return questions.map((question) => {
          return {
            task: question.task?.cs ?? question.task,
            answerList: question.answerList,
            correctAnswerIndex: question.correctAnswerIndex,
            correctAnswerIndexList: question.correctAnswerIndexList,
            correctAnswerOrder: question.correctAnswerOrder,
            type: question.type,
            pairList: question.pairList,
            tripletList: question.tripletList,
          };
        });
      })
      .flat()
      .map(
        ({
          task,
          answerList,
          correctAnswerIndex,
          correctAnswerIndexList,
          correctAnswerOrder,
          type,
          pairList,
          tripletList,
        }) => {
          return {
            task: filterCleanOutput(task),
            answer: type === "T10" ? correctAnswerIndex != 1 : undefined,
            answerList: Array.isArray(answerList)
              ? answerList.reduce((acc, el, index, arr) => {
                  if (type === "T11") {
                    acc.push(
                      filterCleanOutput(
                        arr[index][correctAnswerIndexList[index]]?.cs ??
                          arr[index][correctAnswerIndexList[index]]
                      )
                    );
                    return acc;
                  }

                  if (type === "T04") {
                    if (index == correctAnswerIndex) {
                      acc.push(filterCleanOutput(correctAnswerIndex));
                    }
                    return acc;
                  }

                  if (type === "T07") {
                    acc = [];
                    tripletList.map((row) => {
                      acc.push([
                        filterCleanOutput(arr[0][row[0]]?.cs ?? arr[0][row[0]]),
                        filterCleanOutput(arr[1][row[1]]?.cs ?? arr[1][row[1]]),
                        filterCleanOutput(arr[2][row[2]]?.cs ?? arr[2][row[2]]),
                      ]);
                    });
                    return acc;
                  }

                  if (Array.isArray(pairList)) {
                    acc = [];
                    pairList.map(({ answerIndex, pairAnswerIndex }, index) => {
                      acc.push([
                        filterCleanOutput(
                          arr[0][answerIndex]?.cs ?? arr[0][answerIndex]
                        ),
                        filterCleanOutput(
                          arr[1][pairAnswerIndex]?.cs ?? arr[1][pairAnswerIndex]
                        ),
                      ]);
                    });
                    return acc;
                  }

                  if (Array.isArray(correctAnswerOrder)) {
                    acc.push(
                      filterCleanOutput(
                        arr[correctAnswerOrder[index]]?.cs ??
                          arr[correctAnswerOrder[index]]
                      )
                    );
                    return acc;
                  }

                  if (Number.isInteger(correctAnswerIndex)) {
                    if (index == correctAnswerIndex) {
                      acc.push(filterCleanOutput(el?.cs ?? el));
                    }
                    return acc;
                  }

                  if (Array.isArray(correctAnswerIndexList)) {
                    if (correctAnswerIndexList.includes(index)) {
                      acc.push(filterCleanOutput(el?.cs ?? el));
                    }
                    return acc;
                  }

                  acc.push(filterCleanOutput(el?.cs ?? el));
                  return acc;
                }, [])
              : undefined,
          };
        }
      );
  }
  
  function parseCookie (str){
    return str
      .split(';')
      .map(v => v.split('='))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return acc;
      }, {});
  }

  function getCredentials() {
    const cookie = parseCookie(document.cookie);
    const csrf = cookie['uu.app.csrf'];
    return {
      "x-csrf-token": csrf,
      "x-request-id": "9c3fb262-9c3fb262-31921ca7-0000",
    };
  }

  const cred = getCredentials();
  const topics = await getTopics(cred);
  const lessonsCode = (
    await Promise.all(topics.map((topic) => getLessonList(topic, cred)))
  ).flat();
  const lessons = await Promise.all(
    lessonsCode.map((code) => getLesson(code, cred))
  );
  const answers = formatLessons(lessons);
  var fileToSave = new Blob([JSON.stringify(answers, null, 4)], {
    type: "application/json",
  });
  window.open(URL.createObjectURL(fileToSave), "_blank");
})();
